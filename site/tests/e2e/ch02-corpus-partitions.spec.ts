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

const chapterId = '02-corpus-partitions';
const contentRevision = 3;
const formulaLatex = String.raw`\mathcal{D}=\mathcal{D}_{tr}\mathbin{\dot\cup}\mathcal{D}_{va}\mathbin{\dot\cup}\mathcal{D}_{te},\quad \mathcal{D}_{a}\cap\mathcal{D}_{b}=\varnothing\;(a\ne b)`;
const repositoryRoot = resolve(process.cwd(), '..');
const manifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, 'rust/data/splits.json'), 'utf8'),
) as Record<'train' | 'validation' | 'test', string[]>;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex(
    (line: string) => line.trim() === `// region:${region}`,
  );
  const end = lines.findIndex(
    (line: string) => line.trim() === `// endregion:${region}`,
  );
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = [
  readRustRegion(
    'rust/demos/ch02-corpus-partitions/src/lib.rs',
    'overlapping-excerpts',
  ),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/corpus.rs',
    'document-loader',
  ),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/corpus.rs',
    'partition-invariants',
  ),
  readRustRegion(
    'rust/demos/ch02-corpus-partitions/src/main.rs',
    'chapter-output',
  ),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'Corpus documents and frozen partitions',
    revisionLabel: 'Content revision',
    headings: {
      formula: 'Coverage and separation in one statement',
      history: 'Before dependable holdout boundaries',
      rust: 'Enforce the boundary in Rust',
      visualization: 'Verify all twelve assignments at a glance',
      exercises: 'Predict, then validate',
      decoder: 'Hand only training documents to BPE',
    },
    rustCaptions: [
      'Different excerpt IDs with shared source context',
      'Load whole documents before tokenization',
      'Validate before exposing partition views',
      'The deterministic Chapter 2 audit',
    ],
    roles: {
      train: { title: 'Training', purpose: 'Used to learn' },
      validation: { title: 'Validation', purpose: 'Used to choose' },
      test: { title: 'Test', purpose: 'Used once for final evidence' },
    },
    diagramTitle: 'One corpus, three disjoint document sets',
    documentCountLabel: 'Documents',
    wholeDocument: 'Whole document',
    assignedLabel: 'Assigned documents',
    repeatedLabel: 'Repeated IDs',
    invariants: [
      'Complete: every corpus ID appears',
      'Disjoint: no corpus ID repeats',
      'Paired provenance stays in one partition',
    ],
    exerciseSummary: 'Check your predictions',
    exerciseAnswer: 'Validation reports that the manifest does not cover doc-07.',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'Документы корпуса и фиксированное разбиение на выборки',
    revisionLabel: 'Версия материала',
    headings: {
      formula: 'Полнота и непересечение в одной записи',
      history: 'До появления надёжного разделения обучающих и отложенных данных',
      rust: 'Проверьте границу данных в Rust',
      visualization:
        'Проверьте распределение всех двенадцати документов на одной диаграмме',
      exercises: 'Сначала предскажите, затем проверьте',
      decoder: 'Передайте алгоритму BPE только обучающие документы',
    },
    rustCaptions: [
      'Разные ID фрагментов с общим исходным контекстом',
      'Загрузка целых документов до токенизации',
      'Проверка перед возвратом заимствованных ссылок на документы',
      'Воспроизводимая проверка главы 2',
    ],
    roles: {
      train: { title: 'Обучающая', purpose: 'Для обучения' },
      validation: { title: 'Валидационная', purpose: 'Для выбора настроек' },
      test: { title: 'Тестовая', purpose: 'Один раз для итоговой оценки' },
    },
    diagramTitle: 'Один корпус, три непересекающиеся выборки',
    documentCountLabel: 'Документов',
    wholeDocument: 'Целый документ',
    assignedLabel: 'Распределено документов',
    repeatedLabel: 'Повторяющихся ID',
    invariants: [
      'Полнота: присутствует каждый ID корпуса',
      'Непересечение: ID не повторяются',
      'Документы из одной группы происхождения остаются в одной выборке',
    ],
    exerciseSummary: 'Проверьте ответы',
    exerciseAnswer: 'Проверка сообщит, что манифест не покрывает doc-07.',
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
    order: 2,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of Object.values(localized.headings)) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }

  const displayedFormula = page.locator('.katex-display');
  await expect(displayedFormula).toHaveCount(1);
  await expect(displayedFormula).toHaveCSS('direction', 'ltr');
  await expect(
    displayedFormula.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(4);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(4);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      lineCount: block.querySelectorAll('code > span.line').length,
      tokenColors: [
        ...new Set(
          Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
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
  await expect(rustSources.locator('figcaption span')).toHaveText([
    ...localized.rustCaptions,
  ]);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual([
    'overlapping-excerpts',
    'document-loader',
    'partition-invariants',
    'chapter-output',
  ]);
  await highlightedRust.first().focus();
  await expect(highlightedRust.first()).toBeFocused();

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'corpus-partitions',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="corpus-partitions"]',
  );
  await expect(diagram.locator('figcaption')).toHaveText(localized.diagramTitle);
  const partitionCards = diagram.locator('.partition-card');
  await expect(partitionCards).toHaveCount(3);

  for (const role of ['train', 'validation', 'test'] as const) {
    const partition = diagram.locator(`[data-partition="${role}"]`);
    await expect(partition).toHaveCount(1);
    await expect(
      partition.getByRole('heading', { level: 3, name: localized.roles[role].title }),
    ).toBeVisible();
    await expect(partition.locator('.partition-purpose')).toHaveText(
      localized.roles[role].purpose,
    );
    await expect(partition.locator('.document-count span')).toHaveText(
      localized.documentCountLabel,
    );
    await expect(partition.locator('.document-count strong')).toHaveText(
      String(manifest[role].length),
    );
    await expect(partition.locator('.document-card')).toHaveCount(
      manifest[role].length,
    );
    expect(
      await partition.locator('.document-card').evaluateAll((cards) =>
        cards.map((card) => card.getAttribute('data-document-id')),
      ),
    ).toEqual(manifest[role]);
  }

  const allIds = [...manifest.train, ...manifest.validation, ...manifest.test];
  await expect(diagram.locator('.document-card')).toHaveCount(allIds.length);
  await expect(diagram.locator('.whole-document')).toHaveText(
    allIds.map(() => localized.wholeDocument),
  );
  expect(
    await diagram.locator('.document-card').evaluateAll((cards) =>
      cards.every(
        (card) =>
          Boolean(card.getAttribute('data-language')) &&
          Boolean(card.getAttribute('data-provenance-group')),
      ),
    ),
  ).toBe(true);
  expect(
    await diagram.locator('[data-document-id]').evaluateAll((cards) =>
      new Set(cards.map((card) => card.getAttribute('data-document-id'))).size,
    ),
  ).toBe(allIds.length);
  await expect(diagram.locator('.partition-summary p').nth(0)).toContainText(
    localized.assignedLabel,
  );
  await expect(
    diagram.locator(
      '[data-assigned-count] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText(String.raw`\frac{12}{12}`);
  await expect(diagram.locator('.partition-summary p').nth(1)).toContainText(
    localized.repeatedLabel,
  );
  await expect(diagram.locator('[data-repeated-count]')).toHaveText('0');
  await expect(diagram.locator('.partition-invariants li')).toHaveText([
    ...localized.invariants,
  ]);
  expect(
    await diagram.locator('code').evaluateAll((codes) =>
      codes.every(
        (code) =>
          code.getAttribute('dir') === 'ltr' &&
          window.getComputedStyle(code).direction === 'ltr',
      ),
    ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  const columnCount = await diagram.locator('.partition-grid').evaluate((grid) =>
    window
      .getComputedStyle(grid)
      .gridTemplateColumns.split(/\s+/)
      .filter(Boolean).length,
  );
  expect(columnCount).toBe(expectedColumns);

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(
    localized.exerciseSummary,
  );
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  'chapter 2 localized vertical slice',
  { tag: chapterTag(chapterId) },
  () => {
    test('chapter 2 is second on every course index and preserves locale switching', async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const localeDefinition = chapterLocaleDefinitions.find(
          ({ code }) => code === locale,
        );
        expect(localeDefinition).toBeDefined();
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters.length).toBeGreaterThanOrEqual(2);
        expect(chapters[1]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 2,
            title: localized.chapterTitle,
          }),
        );
        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          localeDefinition?.languageTag ?? '',
        );
        await expect(
          page.getByRole('heading', { level: 1, name: localized.indexTitle }),
        ).toBeVisible();

        await page
          .getByRole('link', { name: localized.chapterTitle })
          .click();
        await expectLocalizedChapterRoute(page, {
          chapterId,
          locale,
          order: 2,
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
      test(`chapter 2 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, 3, chapters);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, 1, chapters);
      });
    }
  },
);
