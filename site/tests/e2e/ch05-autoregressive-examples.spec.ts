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

const chapterId = '05-autoregressive-examples';
const contentRevision = 3;
const formulaLatex = String.raw`x^{(s)}=z_{s:s+T}, \quad y^{(s)}=z_{s+1:s+T+1}`;
const repositoryRoot = resolve(process.cwd(), '..');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = [
  readRustRegion('rust/demos/ch05-autoregressive-examples/src/lib.rs', 'hand-labeled-contrast'),
  readRustRegion('rust/crates/llm-from-scratch/src/data.rs', 'causal-window-policy'),
  readRustRegion('rust/crates/llm-from-scratch/src/data.rs', 'causal-window-iterator'),
  readRustRegion('rust/crates/llm-from-scratch/src/data.rs', 'partition-encoding'),
  readRustRegion('rust/demos/ch05-autoregressive-examples/src/main.rs', 'chapter-output'),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'Building autoregressive input–target pairs',
    revisionLabel: 'Content revision',
    headings: {
      formula: 'Express the one-token shift with slices',
      history: 'Derive next-token targets from the sequence itself',
      rust: 'Build complete pairs without flattening the corpus',
      visualization: 'Inspect shifts and hard boundaries on separate token tapes',
      exercises: 'Predict the pairs, then check them',
      decoder: 'Connect the pairs to the decoder’s task',
    },
    rustCaptions: [
      'Two token sequences with separately supplied sentiment labels',
      'Set the context, stride, count, and too-short-suffix policy',
      'Borrow the input and its one-token-shifted target',
      'Keep encoded documents owned and separated by frozen partition',
      'Run the worked pairs and preserve the frozen 8/2/2 corpus split',
    ],
    policyRustLabel:
      'Rust configuration that validates context and stride, counts complete pairs, and reports a suffix that is too short for another pair',
    diagramTitle: 'Build aligned next-token pairs one document at a time',
    partitionTitles: ['Training partition', 'Validation partition', 'Test partition'],
    sourceLane: 'Wrapped source tokens',
    inputLane: 'Input context',
    targetLane: 'Next-token targets',
    completeExample: 'Complete pair',
    tailLane: 'Too few tokens for another pair',
    notEmitted: 'No new pair',
    tailNote: 'This start cannot form a new pair',
    shiftLabel: 'Each target lies one source position to the right',
    boundaryLabel: 'Hard boundary',
    invariantsLabel: 'Rules shown in the diagram',
    overlapInvariant: 'A suffix that is too short for a new pair may overlap earlier complete pairs.',
    exerciseSummary: 'Check your predictions',
    exerciseAnswer: 'The complete two-token source span gives [0] -> [1].',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'Как составлять авторегрессионные пары «вход — цель»',
    revisionLabel: 'Версия материала',
    headings: {
      formula: 'Опишите сдвиг на один токен с помощью срезов',
      history: 'Откуда языковая модель берёт целевые токены',
      rust: 'Стройте пары, обходя документы по одному',
      visualization: 'Сдвиг цели и границы на отдельных лентах',
      exercises: 'Решите задачи и проверьте себя',
      decoder: 'Что пары «вход — цель» дают декодеру',
    },
    rustCaptions: [
      'Метки тональности задаются отдельно от последовательностей',
      'Проверка параметров, подсчёт пар и поиск остатка',
      'Входной и целевой срезы без копирования',
      'Документы остаются в своих частях корпуса',
      'Пары из примера и неизменное разбиение корпуса 8/2/2',
    ],
    policyRustLabel:
      'Фрагмент кода Rust: конфигурация проверяет длину контекста и шаг, считает полные пары и находит остаток, которого недостаточно для новой пары',
    diagramTitle: 'Пары для следующего токена внутри каждого документа',
    partitionTitles: ['Обучающая выборка', 'Валидационная выборка', 'Тестовая выборка'],
    sourceLane: 'Токены документа, включая BOS и EOS',
    inputLane: 'Входная последовательность',
    targetLane: 'Следующие токены — цели',
    completeExample: 'Пара построена',
    tailLane: 'Остаток: токенов не хватает',
    notEmitted: 'Новой пары нет',
    tailNote:
      'В этой позиции токенов уже не хватает на новую пару, но они могли войти в пары, начавшиеся раньше.',
    shiftLabel: 'Цель сдвинута относительно входа на один токен',
    boundaryLabel: 'Граница документа или части корпуса',
    invariantsLabel: 'Что показывает схема',
    overlapInvariant: 'Токены из остатка могут уже входить в ранее построенные пары.',
    exerciseSummary: 'Проверьте решения',
    exerciseAnswer: 'Из двух токенов получается полная пара [0] -> [1].',
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedDocumentColumns: number,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 5,
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
  await expect(displayedFormula.locator('annotation[encoding="application/x-tex"]')).toHaveText(formulaLatex);

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
  expect(highlightingEvidence[1]?.label).toBe(localized.policyRustLabel);
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator('figcaption span')).toHaveText([...localized.rustCaptions]);
  expect(
    await rustSources.evaluateAll((sources) => sources.map((source) => source.getAttribute('data-source-region'))),
  ).toEqual([
    'hand-labeled-contrast',
    'causal-window-policy',
    'causal-window-iterator',
    'partition-encoding',
    'chapter-output',
  ]);
  await highlightedRust.first().focus();
  await expect(highlightedRust.first()).toBeFocused();

  await expectVisualizationDecision(page, { decision: 'useful', id: 'autoregressive-examples' });
  const diagram = page.locator('figure[data-visualization-id="autoregressive-examples"]');
  await expect(diagram.getByRole('heading', { level: 3, name: localized.diagramTitle })).toBeVisible();
  const partitions = diagram.locator('[data-partition].partition');
  await expect(partitions).toHaveCount(3);
  await expect(partitions.getByRole('heading', { level: 4 })).toHaveText([...localized.partitionTitles]);
  expect(await partitions.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-partition')))).toEqual([
    'train',
    'validation',
    'test',
  ]);

  const documents = diagram.locator('article[data-document]');
  await expect(documents).toHaveCount(4);
  expect(
    await documents.evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-document'),
        partition: node.getAttribute('data-partition'),
        source: Array.from(node.querySelectorAll('.source-lane [data-token-id]')).map((token) =>
          token.getAttribute('data-token-id'),
        ),
        starts: Array.from(node.querySelectorAll('[data-window-start]')).map((window) =>
          window.getAttribute('data-window-start'),
        ),
        tail: node.querySelector('[data-tail-start]')?.getAttribute('data-tail-start') ?? null,
      })),
    ),
  ).toEqual([
    { id: 'train-a', partition: 'train', source: ['0', '41', '42', '43', '44', '1'], starts: ['0', '1', '2'], tail: '3' },
    { id: 'train-b', partition: 'train', source: ['0', '51', '52', '1'], starts: ['0'], tail: '1' },
    { id: 'validation-a', partition: 'validation', source: ['0', '61', '62', '63', '1'], starts: ['0', '1'], tail: '2' },
    { id: 'test-a', partition: 'test', source: ['0', '71', '1'], starts: [], tail: '0' },
  ]);

  const firstWindow = documents.first().locator('[data-window-index="0"]');
  await expect(firstWindow.locator('.lane-label')).toHaveText([localized.inputLane, localized.targetLane]);
  expect(
    await firstWindow.locator('[data-input-position]').evaluateAll((tokens) =>
      tokens.map((token) => token.getAttribute('data-token-id')),
    ),
  ).toEqual(['0', '41', '42']);
  expect(
    await firstWindow.locator('[data-target-position]').evaluateAll((tokens) =>
      tokens.map((token) => token.getAttribute('data-token-id')),
    ),
  ).toEqual(['41', '42', '43']);
  expect(
    await firstWindow.locator('.aligned-tape:not(.target) > code').evaluateAll((tokens) =>
      tokens.map((token) => Array.from(token.parentElement?.children ?? []).indexOf(token)),
    ),
  ).toEqual([0, 1, 2]);
  expect(
    await firstWindow.locator('.aligned-tape.target > code').evaluateAll((tokens) =>
      tokens.map((token) => Array.from(token.parentElement?.children ?? []).indexOf(token)),
    ),
  ).toEqual([1, 2, 3]);

  const nonzeroWindow = documents.first().locator('[data-window-start="1"]');
  expect(
    await nonzeroWindow.locator('.aligned-tape:not(.target) > code').evaluateAll((tokens) =>
      tokens.map((token) => Array.from(token.parentElement?.children ?? []).indexOf(token)),
    ),
  ).toEqual([1, 2, 3]);
  expect(
    await nonzeroWindow.locator('.aligned-tape.target > code').evaluateAll((tokens) =>
      tokens.map((token) => Array.from(token.parentElement?.children ?? []).indexOf(token)),
    ),
  ).toEqual([2, 3, 4]);
  const tailTape = documents.first().locator('.tail-tape');
  expect(
    await tailTape.locator(':scope > code').evaluateAll((tokens) =>
      tokens.map((token) => Array.from(token.parentElement?.children ?? []).indexOf(token)),
    ),
  ).toEqual([3, 4, 5]);

  const alignedColumns = await documents.first().evaluate((documentNode) => {
    const lefts = (selector: string) =>
      Array.from(documentNode.querySelectorAll<HTMLElement>(selector)).map(
        (token) => token.getBoundingClientRect().left,
      );
    return {
      source: lefts('.token-tape > code'),
      firstInput: lefts('[data-window-start="0"] .aligned-tape:not(.target) > code'),
      firstTarget: lefts('[data-window-start="0"] .aligned-tape.target > code'),
      secondInput: lefts('[data-window-start="1"] .aligned-tape:not(.target) > code'),
      secondTarget: lefts('[data-window-start="1"] .aligned-tape.target > code'),
      tail: lefts('.tail-tape > code'),
    };
  });
  const expectAligned = (actual: readonly number[], expected: readonly number[]) => {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((position, index) => expect(Math.abs(position - expected[index])).toBeLessThan(0.75));
  };
  expectAligned(alignedColumns.firstInput, alignedColumns.source.slice(0, 3));
  expectAligned(alignedColumns.firstTarget, alignedColumns.source.slice(1, 4));
  expectAligned(alignedColumns.secondInput, alignedColumns.source.slice(1, 4));
  expectAligned(alignedColumns.secondTarget, alignedColumns.source.slice(2, 5));
  expectAligned(alignedColumns.tail, alignedColumns.source.slice(3, 6));
  await expect(diagram.locator('[data-status="not-emitted"]')).toHaveCount(4);
  await expect(diagram.locator('[data-status="not-emitted"]')).toContainText([
    localized.notEmitted,
    localized.notEmitted,
    localized.notEmitted,
    localized.notEmitted,
  ]);
  await expect(diagram.locator('.tail-note').first()).toContainText(localized.tailNote);
  await expect(diagram.locator('.shift-cue').first()).toContainText(localized.shiftLabel);
  await expect(diagram.locator('.boundary-label').first()).toHaveText(localized.boundaryLabel);
  await expect(diagram.getByRole('heading', { level: 4, name: localized.invariantsLabel })).toBeVisible();
  await expect(diagram.locator('.invariants li').last()).toContainText(localized.overlapInvariant);
  await expect(diagram.locator('[data-control="bos"]')).toHaveCount(4);
  await expect(diagram.locator('[data-control="eos"]')).toHaveCount(4);
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  const sourceTape = diagram.locator('.token-tape').first();
  const inputTape = firstWindow.locator('.aligned-tape:not(.target)');
  const targetTape = firstWindow.locator('.aligned-tape.target');
  await expect(sourceTape).toHaveAccessibleName(
    new RegExp(`${escapeRegExp(localized.sourceLane)}.*BOS:0, 41, 42, 43, 44, EOS:1`),
  );
  await expect(inputTape).toHaveAccessibleName(
    new RegExp(`${escapeRegExp(localized.completeExample)}.*${escapeRegExp(localized.inputLane)}.*0, 41, 42`),
  );
  await expect(targetTape).toHaveAccessibleName(
    new RegExp(`${escapeRegExp(localized.completeExample)}.*${escapeRegExp(localized.targetLane)}.*41, 42, 43`),
  );
  await expect(tailTape).toHaveAccessibleName(
    new RegExp(`${escapeRegExp(localized.tailLane)}.*43, 44, 1`),
  );
  expect(
    await diagram.locator('.token-tape, .aligned-tape, .tail-tape').evaluateAll((tapes) =>
      tapes.every((tape) =>
        (tape.getAttribute('aria-labelledby') ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .every((id) => document.getElementById(id)?.textContent?.trim()),
      ),
    ),
  ).toBe(true);
  await sourceTape.focus();
  await expect(sourceTape).toBeFocused();
  const columnCount = await diagram.locator('.document-list').first().evaluate((node) =>
    window.getComputedStyle(node).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
  );
  expect(columnCount).toBe(expectedDocumentColumns);

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 5 localized vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('chapter 5 is fifth on every course index and preserves locale switching', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(5);
      expect(chapters[4]).toEqual(
        expect.objectContaining({ chapterId, order: 5, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', localeDefinition?.languageTag ?? '');
      await expect(page.getByRole('heading', { level: 1, name: localized.indexTitle })).toBeVisible();
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 5,
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
    test(`chapter 5 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, 2, chapters);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, 1, chapters);
    });
  }
});
