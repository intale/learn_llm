// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

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

const chapterId = '01-text-units';
const contentRevision = 6;
const formulaLatex = String.raw`z_i = V(u_i), \quad u_i \notin S \Rightarrow V(u_i)=0`;
const rustDemoDirectory = resolve(
  process.cwd(),
  '../rust/demos/ch01-text-units/src',
);

function readRustRegion(fileName: string, region: string): string {
  const lines = readFileSync(resolve(rustDemoDirectory, fileName), 'utf8').split(
    /\r?\n/,
  );
  const start = lines.indexOf(`// region:${region}`);
  const end = lines.indexOf(`// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${fileName}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = [
  readRustRegion('lib.rs', 'historical-splitting'),
  readRustRegion('lib.rs', 'text-representations'),
  readRustRegion('lib.rs', 'vocabulary'),
  readRustRegion('main.rs', 'chapter-output'),
];

async function readDiagramGeometry(diagram: Locator) {
  return diagram.evaluate((node) => {
    const root = node as HTMLElement;
    const rootDebt = (element: HTMLElement) => ({
      inline: Math.max(0, element.scrollWidth - element.clientWidth),
      block: Math.max(0, element.scrollHeight - element.clientHeight),
    });
    const paintedDebt = (box: HTMLElement) => {
      const bounds = box.getBoundingClientRect();
      const style = getComputedStyle(box);
      const inner = {
        left: bounds.left + Number.parseFloat(style.borderLeftWidth),
        right: bounds.right - Number.parseFloat(style.borderRightWidth),
        top: bounds.top + Number.parseFloat(style.borderTopWidth),
        bottom: bounds.bottom - Number.parseFloat(style.borderBottomWidth),
      };
      let inline = 0;
      let block = 0;
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        if (!text.textContent?.trim()) continue;
        const parent = text.parentElement;
        if (parent?.closest('[data-diagram-box]') !== box) continue;
        const range = document.createRange();
        range.selectNodeContents(text);
        for (const ink of range.getClientRects()) {
          inline = Math.max(inline, inner.left - ink.left, ink.right - inner.right);
          block = Math.max(block, inner.top - ink.top, ink.bottom - inner.bottom);
        }
      }
      return { inline: Math.max(0, inline), block: Math.max(0, block) };
    };
    return {
      root: rootDebt(root),
      boxes: Array.from(
        root.querySelectorAll<HTMLElement>('[data-diagram-box]'),
        paintedDebt,
      ),
    };
  });
}

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    indexRevision: 'Content revision',
    chapterTitle: 'Text units and vocabulary IDs',
    objectiveLabel: 'In this chapter',
    revisionLabel: 'Content revision',
    headings: {
      formula: 'One lookup per scalar position',
      history: 'Before subword tokenizers',
      rust: 'Implement the mapping in Rust',
      visualization: 'Trace each position across representations',
      exercises: 'Predict, then check',
      decoder: 'The boundary the decoder will consume',
    },
    rustCaptions: [
      'Historical word and scalar boundaries',
      'Two observable text representations',
      'A deterministic scalar vocabulary',
      'The checked chapter example',
    ],
    diagramTitle: 'The same three positions, represented four ways',
    diagramExamples: ['ASCII example: cat', 'Cyrillic example: кот'],
    diagramStages: [
      'Input units',
      'UTF-8 bytes',
      'Unicode scalar values',
      'Vocabulary IDs',
    ],
    byteCounts: ['1 byte', '1 byte', '1 byte', '2 bytes', '2 bytes', '2 bytes'],
    handoffEvidence: [
      'deliberately small Chapter 1 comparison',
      'cumulative llm-from-scratch crate neither imports nor extends it',
      'one token for each of the 256 possible byte values',
      'learned merge tokens that may represent several bytes',
      'new token-ID namespace',
      'an unseen scalar becomes <UNK>',
      'replaced, not extended',
    ],
    exerciseSummary: 'Check your predictions',
    exerciseAnswer: 'The ID sequences are [3, 2, 4] and [5, 6, 7].',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    indexRevision: 'Версия материала',
    chapterTitle: 'Единицы текста и идентификаторы токенов',
    objectiveLabel: 'В этой главе',
    revisionLabel: 'Версия материала',
    headings: {
      formula: 'Один поиск в словаре для каждого скалярного значения',
      history: 'До субсловных токенизаторов',
      rust: 'Реализуйте отображение на Rust',
      visualization: 'Проследите каждую позицию во всех представлениях',
      exercises: 'Сначала предскажите, затем проверьте',
      decoder: 'Интерфейс между токенизатором и декодером',
    },
    rustCaptions: [
      'Разбиение на слова и скалярные значения',
      'Два представления текста',
      'Детерминированный словарь скалярных значений',
      'Проверяемый пример главы',
    ],
    diagramTitle: 'Одни и те же три позиции в четырёх представлениях',
    diagramExamples: ['Пример ASCII: cat', 'Пример на кириллице: кот'],
    diagramStages: [
      'Входные единицы',
      'Байты UTF-8',
      'Скалярные значения Unicode',
      'ID токенов',
    ],
    byteCounts: [
      'Число байтов: 1',
      'Число байтов: 1',
      'Число байтов: 1',
      'Число байтов: 2',
      'Число байтов: 2',
      'Число байтов: 2',
    ],
    handoffEvidence: [
      'небольшая учебная реализация для сравнения',
      'основная библиотека llm-from-scratch его не импортирует и не расширяет',
      'каждому из 256 возможных значений байта будет соответствовать отдельный токен',
      'токены слияний смогут представлять последовательности из нескольких байтов',
      'собственное пространство ID токенизатора',
      'не наследует правило главы 1',
      'будет заменён, а не расширен',
    ],
    exerciseSummary: 'Проверьте ответы',
    exerciseAnswer:
      'Последовательности ID токенов: [3, 2, 4] и [5, 6, 7].',
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedColumns: number,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];

  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 1,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });
  await expect(page.locator('.lesson-objective strong')).toHaveText(
    localized.objectiveLabel,
  );

  await expect(
    page.getByRole('heading', { level: 2, name: localized.headings.formula }),
  ).toBeVisible();
  const displayedFormula = page.locator('.katex-display');
  await expect(displayedFormula).toHaveCount(1);
  await expect(displayedFormula).toBeVisible();
  await expect(displayedFormula).toHaveCSS('direction', 'ltr');
  await expect(
    displayedFormula.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(formulaLatex);

  await expect(
    page.getByRole('heading', { level: 2, name: localized.headings.history }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: localized.headings.rust }),
  ).toBeVisible();

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(4);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(4);
  const fencedOutput = page.locator(
    '.lesson-body pre.astro-code.github-dark-high-contrast[data-language="text"]',
  );
  await expect(fencedOutput).toHaveCount(1);
  await expect(fencedOutput).toHaveAttribute('dir', 'ltr');
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      lineCount: block.querySelectorAll('code > span.line').length,
      tokenColors: [
        ...new Set(
          Array.from(
            block.querySelectorAll<HTMLElement>('code span[style*="color"]'),
          )
            .map((token) => token.style.color)
            .filter(Boolean),
        ),
      ],
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
    })),
  );
  for (const evidence of highlightingEvidence) {
    expect(evidence.lineCount).toBeGreaterThan(0);
    expect(evidence.tokenColors.length).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual([
    'historical-splitting',
    'text-representations',
    'vocabulary',
    'chapter-output',
  ]);
  await expect(rustSources.locator('figcaption span')).toHaveText([
    ...localized.rustCaptions,
  ]);
  await expect(
    page.locator(
      'figure.rust-source[data-source-region="historical-splitting"] pre',
    ),
  ).toContainText('pub fn split_words');
  await expect(
    page.locator(
      'figure.rust-source[data-source-region="text-representations"] pre',
    ),
  ).toContainText('pub fn utf8_bytes');
  await expect(
    page.locator('figure.rust-source[data-source-region="vocabulary"] pre'),
  ).toContainText('pub struct Vocabulary');
  await expect(
    page.locator('figure.rust-source[data-source-region="chapter-output"] pre'),
  ).toContainText('fn main()');
  await rustSources.first().locator('pre').focus();
  await expect(rustSources.first().locator('pre')).toBeFocused();

  await expect(
    page.getByRole('heading', {
      level: 2,
      name: localized.headings.visualization,
    }),
  ).toBeVisible();
  const diagram = page.locator(
    'figure[data-visualization-id="text-units-pipeline"]',
  );
  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'text-units-pipeline',
  });
  await expect(diagram).toBeVisible();
  await expect(diagram.locator(':scope > figcaption > h3')).toHaveText(
    localized.diagramTitle,
  );
  await expect(diagram.locator('.diagram-example')).toHaveCount(2);
  for (const example of localized.diagramExamples) {
    await expect(
      diagram.getByRole('heading', { level: 3, name: example }),
    ).toBeVisible();
  }
  await expect(diagram.locator('.text-units-pipeline')).toHaveCount(2);
  expect(
    await diagram.locator('.text-units-pipeline').evaluateAll((pipelines) =>
      pipelines.map((pipeline) => pipeline.getAttribute('dir')),
    ),
  ).toEqual(['ltr', 'ltr']);
  await expect(diagram.locator('.pipeline-stage')).toHaveCount(8);
  expect(
    await diagram.locator('code').evaluateAll((blocks) =>
      blocks.every(
        (block) =>
          block.getAttribute('dir') === 'ltr' &&
          window.getComputedStyle(block).direction === 'ltr',
      ),
    ),
  ).toBe(true);
  for (const stage of localized.diagramStages) {
    await expect(
      diagram.getByRole('heading', { level: 4, name: stage }),
    ).toHaveCount(2);
  }
  await expect(
    diagram.locator('.pipeline-stage[data-stage="bytes"] small'),
  ).toHaveText([...localized.byteCounts]);
  await expect(
    diagram
      .locator('.diagram-example')
      .first()
      .locator('[data-stage="token-ids"] code'),
  ).toHaveText(['3', '2', '4']);
  await expect(
    diagram
      .locator('.diagram-example')
      .nth(1)
      .locator('[data-stage="token-ids"] code'),
  ).toHaveText(['5', '6', '7']);
  await diagram.focus();
  await expect(diagram).toBeFocused();

  const columnCounts = await diagram
    .locator('.text-units-pipeline')
    .evaluateAll((pipelines) =>
      pipelines.map(
        (pipeline) =>
          window
            .getComputedStyle(pipeline)
            .gridTemplateColumns.split(/\s+/)
            .filter(Boolean).length,
      ),
    );
  expect(columnCounts).toEqual([expectedColumns, expectedColumns]);

  await expect(
    page.getByRole('heading', { level: 2, name: localized.headings.exercises }),
  ).toBeVisible();
  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(
    localized.exerciseSummary,
  );
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);
  await expect(
    page.getByRole('heading', { level: 2, name: localized.headings.decoder }),
  ).toBeVisible();
  const normalizedLesson = (await page.locator('.lesson-body').innerText()).replace(
    /\s+/g,
    ' ',
  );
  for (const evidence of localized.handoffEvidence) {
    expect(normalizedLesson).toContain(evidence);
  }

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  'chapter 1 localized vertical slice',
  { tag: chapterTag(chapterId) },
  () => {
    test('chapter 1 course indexes and locale switch preserve the lesson route', async ({
      page,
      }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const localeDefinition = chapterLocaleDefinitions.find(
          ({ code }) => code === locale,
        );
        expect(localeDefinition).toBeDefined();
        const chapters = await readOrderedCourseChapters(page, locale, {
          includeIntroduction: true,
        });

        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          localeDefinition?.languageTag ?? '',
        );
        await expect(page.locator('html')).toHaveAttribute(
          'dir',
          localeDefinition?.direction ?? '',
        );
        await expect(
          page.getByRole('heading', { level: 1, name: localized.indexTitle }),
        ).toBeVisible();
        expect(
          chapters.find(({ chapterId: candidate }) => candidate === chapterId),
        ).toEqual(
          expect.objectContaining({
            chapterId,
            order: 1,
            title: localized.chapterTitle,
          }),
        );
        const chapterCard = page.getByRole('article').filter({
          has: page.getByRole('link', {
            name: localized.chapterTitle,
            exact: true,
          }),
        });
        await expect(
          chapterCard.getByText(
            `${localized.indexRevision}: ${contentRevision}`,
            { exact: true },
          ),
        ).toBeVisible();
        for (const alternate of chapterLocaleDefinitions) {
          await expect(
            page.locator(
              `link[rel="alternate"][hreflang="${alternate.languageTag}"]`,
            ),
          ).toHaveAttribute('href', `/${alternate.code}/course/`);
          const switchLink = page.locator(
            `.locale-switch a[data-locale="${alternate.code}"]`,
          );
          if (alternate.code === locale) {
            await expect(switchLink).toHaveCount(0);
          } else {
            await expect(switchLink).toHaveAttribute(
              'href',
              `/${alternate.code}/course/`,
            );
          }
        }

        const chapterLink = page.getByRole('link', {
          name: localized.chapterTitle,
        });
        await expect(chapterLink).toHaveAttribute(
          'href',
          chapterPath(locale, chapterId),
        );
        await chapterLink.click();
        await expectLocalizedChapterRoute(page, {
          chapterId,
          locale,
          order: 1,
          revision: contentRevision,
          revisionLabel: localized.revisionLabel,
          title: localized.chapterTitle,
        });
        await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
        await expectNoOverflowOrClientScripts(page);
      }

      for (const source of chapterLocaleDefinitions) {
        for (const target of chapterLocaleDefinitions.filter(
          ({ code }) => code !== source.code,
        )) {
          await page.goto(chapterPath(source.code, chapterId));
          await page
            .locator(`.locale-switch a[data-locale="${target.code}"]`)
            .click();
          await expect(page).toHaveURL(
            new RegExp(`${chapterPath(target.code, chapterId)}$`),
          );
          await expect(page.locator('html')).toHaveAttribute(
            'lang',
            target.languageTag,
          );
          await expect(
            page.getByRole('heading', {
              level: 1,
              name: copy[target.code].chapterTitle,
            }),
          ).toBeVisible();
        }
      }
    });

    for (const locale of chapterLocales) {
      test(`chapter 1 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale, {
          includeIntroduction: true,
        });
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, 4, chapters);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, 1, chapters);
        await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
      });
    }

    test('both localized figures fit full view and restore focus', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="text-units-pipeline"]',
        );
        const toggle = diagram.locator('[data-diagram-full-view-toggle]');
        await expect(toggle).toHaveCount(1);
        expect((await toggle.getAttribute('aria-label'))?.trim()).toBeTruthy();
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute('data-visualization-id') ===
            'text-units-pipeline',
        );

        await expect(diagram.locator('.pipeline-stage')).toHaveCount(8);
        await expect(diagram.locator('[data-diagram-box]')).toHaveCount(32);
        const geometry = await readDiagramGeometry(diagram);
        expect(geometry.root.inline, `${locale} full-view inline travel`).toBeLessThanOrEqual(
          2,
        );
        expect(geometry.root.block, `${locale} full-view block travel`).toBeLessThanOrEqual(
          Math.floor(900 * 0.25),
        );
        for (const [index, box] of geometry.boxes.entries()) {
          expect(box.inline, `${locale} full-view box ${index} inline debt`).toBeLessThanOrEqual(
            2,
          );
          expect(box.block, `${locale} full-view box ${index} block debt`).toBeLessThanOrEqual(
            2,
          );
        }

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test('both localized diagrams retain complete boxes in forced colors', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.emulateMedia({ forcedColors: 'active' });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="text-units-pipeline"]',
        );
        await expect(diagram.locator('.stage-number')).toHaveCount(8);
        const borders = await diagram
          .locator('[data-diagram-box]')
          .evaluateAll((boxes) =>
            boxes.map((box) => {
              const style = getComputedStyle(box);
              return [
                style.borderTopWidth,
                style.borderRightWidth,
                style.borderBottomWidth,
                style.borderLeftWidth,
              ].map(Number.parseFloat);
            }),
          );
        expect(borders).toHaveLength(32);
        expect(borders.every((widths) => widths.every((width) => width > 0))).toBe(
          true,
        );
        const geometry = await readDiagramGeometry(diagram);
        expect(geometry.root.inline, `${locale} forced-color inline travel`).toBeLessThanOrEqual(
          2,
        );
        for (const [index, box] of geometry.boxes.entries()) {
          expect(box.inline, `${locale} forced-color box ${index} inline debt`).toBeLessThanOrEqual(
            2,
          );
          expect(box.block, `${locale} forced-color box ${index} block debt`).toBeLessThanOrEqual(
            2,
          );
        }
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test('both localized lessons retain static evidence without JavaScript', async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      for (const locale of chapterLocales) {
        for (const viewport of [
          { width: 1440, height: 1000 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await page.goto(chapterPath(locale, chapterId));
          await expect(
            page.getByRole('heading', {
              level: 1,
              name: copy[locale].chapterTitle,
            }),
          ).toBeVisible();
          await expect(page.locator('.katex-display')).toHaveCount(1);
          await expect(page.locator('.pipeline-stage')).toHaveCount(8);
          await expect(page.locator('[data-diagram-box]')).toHaveCount(32);
          await expect(page.locator('.lesson-body details')).toHaveCount(1);
          await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(
            0,
          );
          await expectNoOverflowOrClientScripts(page);
        }
      }
      await context.close();
    });
  },
);
