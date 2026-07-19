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

const chapterId = '03-learn-bpe-merges';
const contentRevision = 2;
const formulaLatex = String.raw`(a^{*},b^{*})=\arg\max_{(a,b)}\bigl(C(a,b),-a,-b\bigr),\quad m^{*}=a^{*}\Vert b^{*}`;
const repositoryRoot = resolve(process.cwd(), '..');

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
    'rust/demos/ch03-learn-bpe-merges/src/lib.rs',
    'whole-word-unknown',
  ),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs',
    'overlapping-pair-counting',
  ),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs',
    'non-overlapping-replacement',
  ),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs',
    'deterministic-training',
  ),
  readRustRegion(
    'rust/demos/ch03-learn-bpe-merges/src/main.rs',
    'chapter-output',
  ),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'Learning deterministic BPE merges',
    revisionLabel: 'Content revision',
    headings: {
      formula: 'Select one reproducible rule',
      history: 'From closed word tables to repeated pair merging',
      rust: 'Implement the trainer without a tokenizer library',
      visualization: 'Inspect the same trace as a static figure',
      exercises: 'Predict, then check',
      decoder: 'Freeze ranks before applying them',
    },
    rustCaptions: [
      'A deterministic whole-word table with one unknown bucket',
      'Count overlapping candidates and resolve ties numerically',
      'Replace left to right without consuming an input token twice',
      'Build initial token sequences from the training view only',
      'Learn from the frozen corpus and emit an inspectable trace',
    ],
    diagramTitle: 'Two deterministic BPE merge rounds',
    source: 'Training documents only',
    fields: {
      stage: 'Stage',
      candidates: 'Adjacent-pair candidates',
      count: 'Overlapping count',
      replacements: 'Non-overlapping replacements',
    },
    winner: 'Selected pair',
    boundary: 'Document boundary: pairs stop here',
    invariants: [
      'Candidate counting includes overlapping positions.',
      'Replacement scans left to right without overlap.',
      'Equal counts use the numerically smallest pair.',
      'No pair crosses a document boundary.',
    ],
    exerciseSummary: 'Check your predictions',
    exerciseAnswer: 'The vocabulary has 256+9=265 symbols.',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'Детерминированное обучение правилам слияния BPE',
    revisionLabel: 'Версия материала',
    headings: {
      formula: 'Задайте однозначное правило выбора',
      history: 'От закрытой таблицы слов к многократному слиянию пар',
      rust: 'Реализуйте обучение без готовой библиотеки токенизации',
      visualization: 'Изучите ту же трассировку на статической схеме',
      exercises: 'Сначала предскажите, затем проверьте',
      decoder: 'Зафиксируйте ранги до их применения',
    },
    rustCaptions: [
      'Детерминированный словарь целых слов с одним ID неизвестного токена',
      'Подсчёт кандидатов с перекрытиями и выбор по числовым ID при равной частоте',
      'Замена слева направо без повторного использования входного токена',
      'Начальные последовательности только из обучающей выборки',
      'Обучение на зафиксированной выборке и проверяемая трассировка',
    ],
    diagramTitle: 'Два раунда BPE с детерминированным выбором',
    source: 'Только обучающие документы',
    fields: {
      stage: 'Состояние',
      candidates: 'Соседние пары-кандидаты',
      count: 'Число перекрывающихся вхождений',
      replacements: 'Неперекрывающиеся замены',
    },
    winner: 'Выбранная пара',
    boundary: 'Граница документа: пары через неё не подсчитываются',
    invariants: [
      'При подсчёте учитываются перекрывающиеся позиции.',
      'Замена идёт слева направо без перекрытий.',
      'При равной частоте выбирается численно наименьшая пара.',
      'Пара не пересекает границу документа.',
    ],
    exerciseSummary: 'Проверьте ответы',
    exerciseAnswer: 'В словаре 256+9=265 токенов.',
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedTimelineColumns: readonly number[],
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];

  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 3,
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
  await expect(rustSources).toHaveCount(5);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(5);
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
    'whole-word-unknown',
    'overlapping-pair-counting',
    'non-overlapping-replacement',
    'deterministic-training',
    'chapter-output',
  ]);
  await highlightedRust.first().focus();
  await expect(highlightedRust.first()).toBeFocused();

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'learn-bpe-merges',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="learn-bpe-merges"]',
  );
  await expect(
    diagram.getByRole('heading', { level: 3, name: localized.diagramTitle }),
  ).toBeVisible();
  await expect(diagram.locator('.bpe-training-source')).toContainText(
    localized.source,
  );

  const stages = diagram.locator('[data-stage]');
  await expect(stages).toHaveCount(3);
  await expect(stages.locator('.bpe-documents > li')).toHaveCount(6);
  expect(
    await stages.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-stage')),
    ),
  ).toEqual(['0', '1', '2']);
  await expect(diagram.locator('.bpe-boundary')).toHaveCount(3);
  await expect(diagram.locator('.bpe-boundary')).toContainText([
    localized.boundary,
    localized.boundary,
    localized.boundary,
  ]);

  const tokenStages = await stages.evaluateAll((nodes) =>
    nodes.map((node) =>
      Array.from(node.querySelectorAll('[data-document]')).map((document) => ({
        id: document.getAttribute('data-document'),
        tokens: Array.from(document.querySelectorAll('[data-token-id]')).map(
          (token) => token.getAttribute('data-token-id'),
        ),
      })),
    ),
  );
  expect(tokenStages).toEqual([
    [
      { id: 'train-aaa', tokens: ['97', '97', '97'] },
      { id: 'train-aba', tokens: ['97', '98', '97'] },
    ],
    [
      { id: 'train-aaa', tokens: ['256', '97'] },
      { id: 'train-aba', tokens: ['97', '98', '97'] },
    ],
    [
      { id: 'train-aaa', tokens: ['256', '97'] },
      { id: 'train-aba', tokens: ['257', '97'] },
    ],
  ]);

  const rounds = diagram.locator('[data-round]');
  await expect(rounds).toHaveCount(2);
  await expect(rounds.locator('table caption')).toHaveText([
    localized.fields.candidates,
    localized.fields.candidates,
  ]);
  await expect(rounds.nth(0).locator('tbody tr')).toHaveCount(3);
  await expect(rounds.nth(1).locator('tbody tr')).toHaveCount(3);
  await expect(rounds.locator('tr[data-winner="true"]')).toHaveCount(2);
  await expect(rounds.nth(0).locator('tr[data-winner="true"]')).toContainText(
    '(97,97)',
  );
  await expect(rounds.nth(1).locator('tr[data-winner="true"]')).toContainText(
    '(97,98)',
  );
  await expect(rounds.locator('tr[data-winner="true"]')).toContainText([
    localized.winner,
    localized.winner,
  ]);
  await expect(rounds.nth(0).locator('.merge-facts')).toContainText(
    localized.fields.count,
  );
  await expect(rounds.nth(0).locator('.merge-facts')).toContainText(
    localized.fields.replacements,
  );
  await expect(rounds.nth(0).locator('.merge-facts')).toContainText('256');
  await expect(rounds.nth(0).locator('.merge-facts code')).toHaveText('61 61');
  await expect(rounds.nth(1).locator('.merge-facts')).toContainText('257');
  await expect(rounds.nth(1).locator('.merge-facts code')).toHaveText('61 62');

  await expect(diagram.locator('.bpe-invariants li')).toContainText([
    ...localized.invariants,
  ]);
  expect(
    await diagram.locator('code, bdi.numeric, .numeric').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  await diagram.locator('.candidate-scroll').first().focus();
  await expect(diagram.locator('.candidate-scroll').first()).toBeFocused();

  const timelineColumns = await diagram
    .locator('.bpe-timeline-step')
    .evaluateAll((steps) =>
      steps.map(
        (step) =>
          window
            .getComputedStyle(step)
            .gridTemplateColumns.split(/\s+/)
            .filter(Boolean).length,
      ),
    );
  expect(timelineColumns).toEqual(expectedTimelineColumns);

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
  'chapter 3 localized vertical slice',
  { tag: chapterTag(chapterId) },
  () => {
    test('chapter 3 is third on every course index and preserves locale switching', async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const localeDefinition = chapterLocaleDefinitions.find(
          ({ code }) => code === locale,
        );
        expect(localeDefinition).toBeDefined();
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters.length).toBeGreaterThanOrEqual(3);
        expect(chapters[2]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 3,
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

        await page.getByRole('link', { name: localized.chapterTitle }).click();
        await expectLocalizedChapterRoute(page, {
          chapterId,
          locale,
          order: 3,
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
      test(`chapter 3 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, [2, 2, 1], chapters);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, [1, 1, 1], chapters);
      });
    }
  },
);
