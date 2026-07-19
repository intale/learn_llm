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

const chapterId = '04-apply-bpe-tokenizer';
const contentRevision = 2;
const formulaLatex = String.raw`\operatorname{decode}_{content}(\operatorname{encode}_{content}(x))=\operatorname{bytes}(x)`;
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
  readRustRegion('rust/demos/ch04-apply-bpe-tokenizer/src/lib.rs', 'unknown-token-loss'),
  readRustRegion('rust/crates/llm-from-scratch/src/tokenizer/bpe.rs', 'token-id-layout'),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/tokenizer/bpe.rs',
    'ranked-content-encoding',
  ),
  readRustRegion('rust/crates/llm-from-scratch/src/tokenizer/bpe.rs', 'byte-exact-decoding'),
  readRustRegion('rust/crates/llm-from-scratch/src/tokenizer/bpe.rs', 'document-wrapping'),
  readRustRegion('rust/demos/ch04-apply-bpe-tokenizer/src/main.rs', 'chapter-output'),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'Applying and reversing a BPE tokenizer',
    revisionLabel: 'Content revision',
    headings: {
      formula: 'Guarantee exact bytes in one direction',
      history: 'Replace the unknown-string hole with byte coverage',
      rust: 'Build a frozen, strict tokenizer in Rust',
      visualization: 'Follow grouping and exact inverse concatenation',
      exercises: 'Predict, then check',
      decoder: 'Preserve one boundary-aware sequence per document',
    },
    rustCaptions: [
      'A closed word table that cannot reverse an unseen spelling',
      'Tokenizer layout version 1 and its checked ID ranges',
      'Initialize byte IDs and replay every frozen rank',
      'Recover bytes first; validate text only on request',
      'Add endpoint controls after encoding and validate them strictly',
      'Print exact tokenizer, edge-case, and visualization evidence',
    ],
    diagramTitle: 'Ranked byte groups reverse to the exact input',
    cases: [
      'ASCII example: bee plus a space',
      'Cyrillic example: a space plus а',
    ],
    grouped: 'Canonical ranked groups',
    exact: 'Exact byte match',
    invariants: [
      'Frozen ranks run in ascending order; the input never changes their priority.',
      'Every content ID is its Chapter 3 training ID plus two.',
      'BOS and EOS appear only after encoding and only at document endpoints.',
      'Stored piece bytes concatenate to the exact input without normalization.',
    ],
    exerciseSummary: 'Check your predictions',
    exerciseAnswer: 'IDs [257,256] recover bytes ff fe exactly',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'Кодирование и декодирование с помощью BPE-токенизатора',
    revisionLabel: 'Версия материала',
    headings: {
      formula: 'Односторонняя гарантия: точное восстановление байтов',
      history: 'Как байтовый алфавит устраняет необходимость в <UNK>',
      rust: 'Реализуйте на Rust зафиксированный токенизатор со строгой проверкой',
      visualization: 'Проследите группировку и восстановление исходных байтов',
      exercises: 'Сначала предскажите, затем проверьте',
      decoder: 'Сохраняйте каждый документ как отдельную последовательность с границами',
    },
    rustCaptions: [
      'Закрытая таблица слов не восстанавливает отсутствующее в словаре написание',
      'Схема ID токенизатора версии 1 и проверяемые диапазоны',
      'Преобразуйте байты в ID и примените слияния по возрастанию ранга',
      'Сначала восстановите байты, а корректность UTF-8 проверяйте только при преобразовании в текст',
      'После кодирования добавьте управляющие токены и проверьте их положение',
      'Выведите проверяемые данные о токенизаторе и граничных случаях',
    ],
    diagramTitle: 'Из групп байтов без потерь восстанавливаются исходные данные',
    cases: [
      'ASCII: bee с пробелом в конце',
      'Кириллица: пробел перед «а»',
    ],
    grouped: 'Канонические группы после слияний',
    exact: 'Байты совпадают с исходными',
    invariants: [
      'Слияния применяются по возрастанию ранга; новый вход не меняет их порядок.',
      'Каждый ID содержимого на два больше соответствующего ID из пространства обучения главы 3.',
      'BOS и EOS добавляются после кодирования и встречаются только по краям документа.',
      'Последовательное объединение байтов токенов восстанавливает вход без нормализации.',
    ],
    exerciseSummary: 'Проверьте ответы',
    exerciseAnswer: 'ID [257,256] точно восстанавливают ff fe',
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedExampleColumns: number,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 4,
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
  await expect(rustSources).toHaveCount(6);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(6);
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
    'unknown-token-loss',
    'token-id-layout',
    'ranked-content-encoding',
    'byte-exact-decoding',
    'document-wrapping',
    'chapter-output',
  ]);
  await highlightedRust.first().focus();
  await expect(highlightedRust.first()).toBeFocused();

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'apply-bpe-tokenizer',
  });
  const diagram = page.locator('figure[data-visualization-id="apply-bpe-tokenizer"]');
  await expect(
    diagram.getByRole('heading', { level: 3, name: localized.diagramTitle }),
  ).toBeVisible();
  const cases = diagram.locator('[data-case]');
  await expect(cases).toHaveCount(2);
  await expect(cases.getByRole('heading', { level: 4 })).toHaveText([
    ...localized.cases,
  ]);
  expect(
    await cases.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-case'))),
  ).toEqual(['ascii-bee', 'cyrillic-a']);

  const exactPipelines = await cases.evaluateAll((nodes) =>
    nodes.map((node) => ({
      initial: Array.from(node.querySelectorAll('[data-lane="initial"] [data-token-id]')).map(
        (token) => token.getAttribute('data-token-id'),
      ),
      pieces: Array.from(node.querySelectorAll('[data-lane="grouped"] [data-piece-index]')).map(
        (piece) => ({
          index: piece.getAttribute('data-piece-index'),
          rank: piece.getAttribute('data-merge-rank'),
          token: piece.querySelector('[data-token-id]')?.getAttribute('data-token-id'),
        }),
      ),
      document: Array.from(node.querySelectorAll('[data-lane="document"] [data-token-id]')).map(
        (token) => token.getAttribute('data-token-id'),
      ),
      decoded: Array.from(node.querySelectorAll('[data-lane="decoded"] [data-byte]')).map(
        (byte) => byte.getAttribute('data-byte'),
      ),
    })),
  );
  expect(exactPipelines).toEqual([
    {
      initial: ['100', '103', '103', '34'],
      pieces: [
        { index: '0', rank: 'byte', token: '100' },
        { index: '1', rank: 'byte', token: '103' },
        { index: '2', rank: '7', token: '265' },
      ],
      document: ['0', '100', '103', '265', '1'],
      decoded: ['62', '65', '65', '20'],
    },
    {
      initial: ['34', '210', '178'],
      pieces: [
        { index: '0', rank: '0', token: '258' },
        { index: '1', rank: 'byte', token: '178' },
      ],
      document: ['0', '258', '178', '1'],
      decoded: ['20', 'd0', 'b0'],
    },
  ]);
  await expect(cases.locator('[data-lane="grouped"] h5')).toHaveText([
    localized.grouped,
    localized.grouped,
  ]);
  await expect(diagram.locator('[data-control="bos"]')).toHaveCount(2);
  await expect(diagram.locator('[data-control="eos"]')).toHaveCount(2);
  await expect(diagram.locator('[data-round-trip="exact"]')).toContainText([
    localized.exact,
    localized.exact,
  ]);
  await expect(diagram.locator('.invariants li')).toContainText([
    ...localized.invariants,
  ]);
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  await diagram.locator('.token-tape').first().focus();
  await expect(diagram.locator('.token-tape').first()).toBeFocused();
  const columnCount = await diagram.locator('.example-list').evaluate((node) =>
    window
      .getComputedStyle(node)
      .gridTemplateColumns.split(/\s+/)
      .filter(Boolean).length,
  );
  expect(columnCount).toBe(expectedExampleColumns);

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 4 localized vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('chapter 4 is fourth on every course index and preserves locale switching', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(4);
      expect(chapters[3]).toEqual(
        expect.objectContaining({ chapterId, order: 4, title: localized.chapterTitle }),
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
        order: 4,
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
        await expect(
          page.getByRole('heading', { level: 1, name: copy[target.code].chapterTitle }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 4 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
      page,
    }) => {
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
