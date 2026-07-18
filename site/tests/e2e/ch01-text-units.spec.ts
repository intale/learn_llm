import { expect, test, type Page } from '@playwright/test';

import {
  chapterLocales,
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

const chapterId = '01-text-units';
const contentRevision = 2;
const formulaLatex = String.raw`z_i = V(u_i), \quad u_i \notin S \Rightarrow V(u_i)=0`;

const copy = {
  en: {
    alternateLocale: 'ru',
    alternateLanguage: 'Русский',
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
    exerciseSummary: 'Check your predictions',
    exerciseAnswer: 'The ID sequences are [3, 2, 4] and [5, 6, 7].',
  },
  ru: {
    alternateLocale: 'en',
    alternateLanguage: 'English',
    indexTitle: 'От текста до небольшой языковой модели',
    indexRevision: 'Версия материала',
    chapterTitle: 'Единицы текста и идентификаторы токенов',
    objectiveLabel: 'В этой главе',
    revisionLabel: 'Версия материала',
    headings: {
      formula: 'Одно обращение к словарю для каждой позиции',
      history: 'До субсловных токенизаторов',
      rust: 'Реализуйте отображение на Rust',
      visualization: 'Проследите позицию через все представления',
      exercises: 'Сначала предскажите, затем проверьте',
      decoder: 'Граница данных для декодера',
    },
    rustCaptions: [
      'Исторические границы слов и скалярных значений',
      'Два наблюдаемых представления текста',
      'Детерминированный словарь скалярных значений',
      'Проверяемый пример главы',
    ],
    diagramTitle: 'Три позиции в четырёх представлениях',
    diagramExamples: ['Пример ASCII: cat', 'Пример на кириллице: кот'],
    diagramStages: [
      'Входные единицы',
      'Байты UTF-8',
      'Скалярные значения Unicode',
      'Идентификаторы словаря',
    ],
    byteCounts: ['1 байт', '1 байт', '1 байт', '2 байта', '2 байта', '2 байта'],
    exerciseSummary: 'Проверить ответы',
    exerciseAnswer:
      'Последовательности идентификаторов: [3, 2, 4] и [5, 6, 7].',
  },
} as const;

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedColumns: number,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];

  await expectLocalizedChapterRoute(page, {
    alternateLanguage: localized.alternateLanguage,
    chapterId,
    locale,
    order: 1,
    revision: contentRevision,
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
  await expect(diagram.locator('figcaption')).toHaveText(
    localized.diagramTitle,
  );
  await expect(diagram.locator('.diagram-example')).toHaveCount(2);
  for (const example of localized.diagramExamples) {
    await expect(
      diagram.getByRole('heading', { level: 3, name: example }),
    ).toBeVisible();
  }
  await expect(diagram.locator('.text-units-pipeline')).toHaveCount(2);
  await expect(diagram.locator('.pipeline-stage')).toHaveCount(8);
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

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  'chapter 1 bilingual vertical slice',
  { tag: chapterTag(chapterId) },
  () => {
    test('chapter 1 course indexes and locale switch preserve the lesson route', async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const chapters = await readOrderedCourseChapters(page, locale);

        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(
          page.getByRole('heading', { level: 1, name: localized.indexTitle }),
        ).toBeVisible();
        expect(chapters[0]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 1,
            title: localized.chapterTitle,
          }),
        );
        await expect(
          page.getByText(`${localized.indexRevision}: ${contentRevision}`, {
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.locator(`link[rel="alternate"][hreflang="${locale}"]`),
        ).toHaveAttribute('href', `/${locale}/course/`);
        await expect(
          page.locator(
            `link[rel="alternate"][hreflang="${localized.alternateLocale}"]`,
          ),
        ).toHaveAttribute('href', `/${localized.alternateLocale}/course/`);
        await expect(page.locator('.locale-switch a')).toHaveAttribute(
          'href',
          `/${localized.alternateLocale}/course/`,
        );

        const chapterLink = page.getByRole('link', {
          name: localized.chapterTitle,
        });
        await expect(chapterLink).toHaveAttribute(
          'href',
          chapterPath(locale, chapterId),
        );
        await chapterLink.click();
        await expectLocalizedChapterRoute(page, {
          alternateLanguage: localized.alternateLanguage,
          chapterId,
          locale,
          order: 1,
          revision: contentRevision,
          title: localized.chapterTitle,
        });
        await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
        await expectNoOverflowOrClientScripts(page);
      }

      await page.goto(chapterPath('en', chapterId));
      await page.getByRole('link', { name: copy.en.alternateLanguage }).click();
      await expect(page).toHaveURL(
        new RegExp(`${chapterPath('ru', chapterId)}$`),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      await expect(
        page.getByRole('heading', { level: 1, name: copy.ru.chapterTitle }),
      ).toBeVisible();

      await page.getByRole('link', { name: copy.ru.alternateLanguage }).click();
      await expect(page).toHaveURL(
        new RegExp(`${chapterPath('en', chapterId)}$`),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(
        page.getByRole('heading', { level: 1, name: copy.en.chapterTitle }),
      ).toBeVisible();
    });

    for (const locale of chapterLocales) {
      test(`chapter 1 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, 4, chapters);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, 1, chapters);
      });
    }
  },
);
