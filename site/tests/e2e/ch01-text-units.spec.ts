import { expect, test, type Page } from '@playwright/test';

const chapterId = '01-text-units';
const contentRevision = 2;
const formulaLatex = String.raw`z_i = V(u_i), \quad u_i \notin S \Rightarrow V(u_i)=0`;
const locales = ['en', 'ru'] as const;

type Locale = (typeof locales)[number];

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
    diagramStages: ['Input units', 'UTF-8 bytes', 'Unicode scalar values', 'Vocabulary IDs'],
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
    exerciseAnswer: 'Последовательности идентификаторов: [3, 2, 4] и [5, 6, 7].',
  },
} as const;

function chapterPath(locale: Locale) {
  return `/${locale}/course/${chapterId}/`;
}

async function expectChapterContent(page: Page, locale: Locale, expectedColumns: number) {
  const localized = copy[locale];

  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.getByRole('heading', { level: 1, name: localized.chapterTitle })).toBeVisible();
  await expect(page.locator('.eyebrow')).toContainText(
    `01 · ${localized.revisionLabel} ${contentRevision}`,
  );
  await expect(page.locator('.lesson-objective strong')).toHaveText(localized.objectiveLabel);

  await expect(
    page.locator(`link[rel="alternate"][hreflang="${locale}"]`),
  ).toHaveAttribute('href', chapterPath(locale));
  await expect(
    page.locator(`link[rel="alternate"][hreflang="${localized.alternateLocale}"]`),
  ).toHaveAttribute('href', chapterPath(localized.alternateLocale));
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
    'href',
    '/',
  );
  await expect(page.getByRole('link', { name: localized.alternateLanguage })).toHaveAttribute(
    'href',
    chapterPath(localized.alternateLocale),
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
  await expect(rustSources.locator('figcaption span')).toHaveText([...localized.rustCaptions]);
  await expect(
    page.locator('figure.rust-source[data-source-region="historical-splitting"] pre'),
  ).toContainText('pub fn split_words');
  await expect(
    page.locator('figure.rust-source[data-source-region="text-representations"] pre'),
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
    page.getByRole('heading', { level: 2, name: localized.headings.visualization }),
  ).toBeVisible();
  const diagram = page.locator('figure[data-visualization-id="text-units-pipeline"]');
  await expect(diagram).toBeVisible();
  await expect(diagram.locator('figcaption')).toHaveText(localized.diagramTitle);
  await expect(diagram.locator('.diagram-example')).toHaveCount(2);
  for (const example of localized.diagramExamples) {
    await expect(diagram.getByRole('heading', { level: 3, name: example })).toBeVisible();
  }
  await expect(diagram.locator('.text-units-pipeline')).toHaveCount(2);
  await expect(diagram.locator('.pipeline-stage')).toHaveCount(8);
  for (const stage of localized.diagramStages) {
    await expect(diagram.getByRole('heading', { level: 4, name: stage })).toHaveCount(2);
  }
  await expect(diagram.locator('.pipeline-stage[data-stage="bytes"] small')).toHaveText(
    [...localized.byteCounts],
  );
  await expect(
    diagram.locator('.diagram-example').first().locator('[data-stage="token-ids"] code'),
  ).toHaveText(['3', '2', '4']);
  await expect(
    diagram.locator('.diagram-example').nth(1).locator('[data-stage="token-ids"] code'),
  ).toHaveText(['5', '6', '7']);
  await diagram.focus();
  await expect(diagram).toBeFocused();

  const columnCounts = await diagram.locator('.text-units-pipeline').evaluateAll((pipelines) =>
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
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);
  await expect(
    page.getByRole('heading', { level: 2, name: localized.headings.decoder }),
  ).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  await expect(page.locator('script')).toHaveCount(0);
}

test.describe('chapter 1 bilingual vertical slice @chapter:01-text-units', () => {
  test('chapter 1 course indexes and locale switch preserve the lesson route', async ({ page }) => {
    for (const locale of locales) {
      const localized = copy[locale];
      await page.goto(`/${locale}/course/`);

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { level: 1, name: localized.indexTitle })).toBeVisible();
      await expect(page.locator('.course-list > li')).toHaveCount(1);
      await expect(
        page.getByText(`${localized.indexRevision}: ${contentRevision}`, { exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(`link[rel="alternate"][hreflang="${locale}"]`),
      ).toHaveAttribute('href', `/${locale}/course/`);
      await expect(
        page.locator(`link[rel="alternate"][hreflang="${localized.alternateLocale}"]`),
      ).toHaveAttribute('href', `/${localized.alternateLocale}/course/`);
      await expect(page.locator('.locale-switch a')).toHaveAttribute(
        'href',
        `/${localized.alternateLocale}/course/`,
      );

      const chapterLink = page.getByRole('link', { name: localized.chapterTitle });
      await expect(chapterLink).toHaveAttribute('href', chapterPath(locale));
      await chapterLink.click();
      await expect(page).toHaveURL(new RegExp(`${chapterPath(locale)}$`));
      await expect(
        page.getByRole('heading', { level: 1, name: localized.chapterTitle }),
      ).toBeVisible();
      await expect(page.locator('script')).toHaveCount(0);
    }

    await page.goto(chapterPath('en'));
    await page.getByRole('link', { name: copy.en.alternateLanguage }).click();
    await expect(page).toHaveURL(new RegExp(`${chapterPath('ru')}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { level: 1, name: copy.ru.chapterTitle })).toBeVisible();

    await page.getByRole('link', { name: copy.ru.alternateLanguage }).click();
    await expect(page).toHaveURL(new RegExp(`${chapterPath('en')}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1, name: copy.en.chapterTitle })).toBeVisible();
  });

  for (const locale of locales) {
    test(`chapter 1 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(chapterPath(locale));
      await expectChapterContent(page, locale, 4);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, 1);
    });
  }
});
