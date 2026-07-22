// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '09-tensor-views';
const contentRevision = 2;
const chapterTitle = 'One buffer, several tensor interpretations';
const chapterDescription =
  'Follow fixed-context word features into Q/K/V and split attention heads, then compare copied and borrowed Rust tensor transposes.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`\prod_k n_k=\prod_j n'_j, \quad s'_k=s_{\pi(k)}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From fixed context to split and merged attention heads';
const historyLimitation =
  "In Bengio et al.'s feed-forward configuration, learned feature vectors for a fixed number of preceding words are concatenated into one vector x and used to predict the next-word distribution. Its layout is fixed by the selected context width rather than exposing sequence and head axes for a growing causal prefix.";
const bengioClaim =
  "In Bengio et al.'s feed-forward configuration, learned feature vectors for a fixed number of preceding words are concatenated into one vector x and used to predict the next-word distribution.";
const vaswaniClaim =
  'Vaswani et al. define attention on query, key, and value matrices, compute scaled products with transposed keys, and run learned projections in parallel heads whose outputs are concatenated.';
const gpt2Claim =
  "OpenAI's GPT-2 model.py projects one [batch, sequence, features] tensor into packed Q/K/V values, splits and transposes them to a head axis, multiplies by K with its last two axes transposed, then transposes and merges heads.";
const modernLlmRole =
  "Reshape, axis permutation, and transpose let this course express the logical split-head, K-transpose, and merge-head layouts used by decoder attention; borrowed TensorView and explicit materialization are local implementation policies, not storage behavior claimed by the papers or GPT-2's TensorFlow code.";
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf',
  'https://github.com/openai/gpt-2/blob/master/src/model.py',
] as const;

const diagramCopy = {
  title: 'One owner, four metadata interpretations',
  description:
    'Compare shared reshape, transpose, and slice records, then follow the slice into materialized storage and inspect rejected requests.',
  sections: [
    'Start with one owned storage buffer',
    'Compare equal shapes with different reading orders',
    'Follow source offsets into a materialized copy',
    'Keep incompatible operations explicit',
  ],
};

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustRegions = [
  ['rust/demos/ch09-tensor-views/src/lib.rs', 'eager-copying-transpose'],
  ['rust/crates/llm-from-scratch/src/tensor/view.rs', 'borrowed-tensor-view'],
  ['rust/crates/llm-from-scratch/src/tensor/view.rs', 'view-axis-transforms'],
  ['rust/crates/llm-from-scratch/src/tensor/view.rs', 'view-slice-materialize'],
  ['rust/demos/ch09-tensor-views/src/main.rs', 'learner-view-output'],
  ['rust/demos/ch09-tensor-views/src/diagram_trace.rs', 'tensor-views-trace'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) => readRustRegion(path, region));

async function expectViewCard(
  page: Page,
  id: string,
  expected: Readonly<{
    storage: string;
    contiguous: 'yes' | 'no';
    shape: string;
    strides: string;
    offsets: string;
    values: string;
  }>,
) {
  const card = page.locator(`[data-view-id="${id}"]`);
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute('data-storage-id', expected.storage);
  await expect(card).toHaveAttribute('data-contiguous', expected.contiguous);
  await expect(card).toContainText(expected.shape);
  await expect(card).toContainText(expected.strides);
  await expect(card).toContainText(expected.offsets);
  await expect(card).toContainText(expected.values);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 9,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  const sectionHeadings = page.locator('.lesson-body h2');
  await expect(sectionHeadings).toHaveText([
    'Predict two [3, 2] tensors before reading their values',
    'Separate reshape compatibility from axis permutation',
    'Account for every extent, axis, and stride',
    historyHeading,
    'Borrow the owner, transform metadata, copy only on command',
    'See shared storage and copied storage as different states',
    'Predict metadata and ownership before running Rust',
    'Carry explicit axes into broadcasting and reductions',
  ]);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${historyHeading}"]]`,
    );
  const historyText = (await historyNodes.allInnerTexts())
    .join(' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  expect(historyText).toContain(historyLimitation);
  expect(historyText).toContain(bengioClaim);
  expect(historyText).toContain(`${vaswaniClaim} ${gpt2Claim}`);
  expect(historyText).toContain(vaswaniClaim);
  expect(historyText).toContain(gpt2Claim);
  expect(historyText).toContain(modernLlmRole);
  expect(historyText).not.toMatch(/Iliffe|Genie|NumPy|codeword|array internals|Rust slice reference/i);
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(
    historySources,
  );

  const formulae = page.locator('.katex-display');
  await expect(formulae).toHaveCount(1);
  await expect(formulae).toHaveCSS('direction', 'ltr');
  await expect(formulae.locator('annotation[encoding="application/x-tex"]')).toHaveText(
    formulaLatex,
  );

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(6);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(6);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) => blocks.map((block) => block.textContent)),
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

  await expectVisualizationDecision(page, { decision: 'useful', id: 'tensor-views' });
  const diagram = page.locator('figure[data-visualization-id="tensor-views"]');
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }

  const baseCells = diagram.locator('[data-storage-offset]');
  await expect(baseCells).toHaveCount(6);
  expect(
    await baseCells.evaluateAll((cells) =>
      cells.map((cell) => ({
        offset: cell.getAttribute('data-storage-offset'),
        value: cell.getAttribute('data-storage-value'),
      })),
    ),
  ).toEqual([
    { offset: '0', value: '10.0' },
    { offset: '1', value: '11.0' },
    { offset: '2', value: '12.0' },
    { offset: '3', value: '20.0' },
    { offset: '4', value: '21.0' },
    { offset: '5', value: '22.0' },
  ]);

  const storageCardFit = await diagram
    .locator('.storage-panel > .view-card')
    .evaluate((card) => {
      const finalContent = card.querySelector<HTMLElement>('.buffer-scroll');
      if (!finalContent) throw new Error('The storage card has no final buffer region.');
      const cardStyle = window.getComputedStyle(card);
      return {
        actualBottomGap:
          card.getBoundingClientRect().bottom - finalContent.getBoundingClientRect().bottom,
        expectedBottomGap:
          Number.parseFloat(cardStyle.paddingBottom) +
          Number.parseFloat(cardStyle.borderBottomWidth),
      };
    });
  expect(
    Math.abs(storageCardFit.actualBottomGap - storageCardFit.expectedBottomGap),
  ).toBeLessThan(1);

  await expectViewCard(page, 'reshape', {
    storage: 'base',
    contiguous: 'yes',
    shape: '[3, 2]',
    strides: '[2, 1]',
    offsets: '[0, 1, 2, 3, 4, 5]',
    values: '[10.0, 11.0, 12.0, 20.0, 21.0, 22.0]',
  });
  await expectViewCard(page, 'transpose', {
    storage: 'base',
    contiguous: 'no',
    shape: '[3, 2]',
    strides: '[1, 3]',
    offsets: '[0, 3, 1, 4, 2, 5]',
    values: '[10.0, 20.0, 11.0, 21.0, 12.0, 22.0]',
  });
  await expect(diagram.locator('[data-view-id="transpose"]')).toContainText('[0, 1]');
  await expectViewCard(page, 'slice', {
    storage: 'base',
    contiguous: 'no',
    shape: '[2, 2]',
    strides: '[3, 1]',
    offsets: '[1, 2, 4, 5]',
    values: '[11.0, 12.0, 21.0, 22.0]',
  });
  await expect(diagram.locator('[data-view-id="slice"]')).toContainText('1: 1..3');
  await expectViewCard(page, 'materialized', {
    storage: 'materialized',
    contiguous: 'yes',
    shape: '[2, 2]',
    strides: '[2, 1]',
    offsets: '[0, 1, 2, 3]',
    values: '[11.0, 12.0, 21.0, 22.0]',
  });

  expect(
    await diagram.locator('[data-source-offset]').evaluateAll((items) =>
      items.map((item) => ({
        source: item.getAttribute('data-source-offset'),
        copied: item.getAttribute('data-copied-offset'),
      })),
    ),
  ).toEqual([
    { source: '1', copied: '0' },
    { source: '2', copied: '1' },
    { source: '4', copied: '2' },
    { source: '5', copied: '3' },
  ]);

  const errors = diagram.locator('[data-error-kind]');
  await expect(errors).toHaveCount(3);
  expect(
    await errors.evaluateAll((items) => items.map((item) => item.getAttribute('data-error-kind'))),
  ).toEqual(['element-count-mismatch', 'non-row-major-contiguous', 'out-of-bounds']);
  await expect(errors.nth(0)).toContainText('Reshape');
  await expect(errors.nth(0)).toContainText('[4, 2]');
  await expect(errors.nth(0)).toContainText('Source elements');
  await expect(errors.nth(0)).toContainText('Requested elements');
  await expect(errors.nth(0)).toContainText('6');
  await expect(errors.nth(0)).toContainText('8');
  await expect(errors.nth(0)).toContainText('different element count');
  await expect(errors.nth(1)).toContainText('Reshape');
  await expect(errors.nth(1)).toContainText('[2, 3]');
  await expect(errors.nth(1)).toContainText('materialize before reshaping');
  await expect(errors.nth(2)).toContainText('Slice');
  await expect(errors.nth(2)).toContainText('1: 1..4');
  await expect(errors.nth(2)).toContainText('Axis size');
  await expect(errors.nth(2)).toContainText('3');
  await expect(errors.nth(2)).toContainText('exceeds the selected axis size');
  await expect(diagram.locator('.view-card.shared .state-symbol')).toHaveText(['◇', '◇', '◇', '◇']);
  await expect(diagram.locator('.view-card.materialized .state-symbol')).toHaveText('◆');
  await expect(diagram.locator('.error-card .state-symbol')).toHaveText(['×', '×', '×']);

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  for (const region of [diagram.locator('.buffer-scroll'), diagram.locator('.provenance-scroll')]) {
    await region.focus();
    await expect(region).toBeFocused();
    if (narrow) {
      const widths = await region.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(7);

  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 9 tensor-views vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('English includes Chapter 9 while Russian remains complete through Chapter 7', async ({ page }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(9);
    expect(englishChapters[8]).toEqual(
      expect.objectContaining({ chapterId, order: 9, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '08-tensor-storage'));
    await expectOrderedChapterNavigation(page, 'en', '08-tensor-storage', englishChapters);
    await page.goto(chapterPath('ru', '07-language-model-metrics'));
    await expectOrderedChapterNavigation(page, 'ru', '07-language-model-metrics', russianChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 9,
      revision: contentRevision,
      revisionLabel,
      title: chapterTitle,
      equivalentLocales: ['en'],
      fallbackRouteSuffix: '/course/',
    });
    const russianSwitch = page.locator('.locale-switch a[data-locale="ru"]');
    await expect(russianSwitch).toHaveAttribute('href', '/ru/course/');
    await expect(russianSwitch).toHaveAttribute('data-locale-fallback', 'course-index');
    await expect(russianSwitch).toHaveAttribute('aria-label', /.+/);

    const missing = await page.goto(chapterPath('ru', chapterId));
    expect(missing?.status()).toBe(404);
  });

  test('the complete Rust-backed lesson renders at desktop and narrow widths', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const chapters = await readOrderedCourseChapters(page, 'en');
    await page.goto(chapterPath('en', chapterId));
    await expectChapterContent(page, chapters, false);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectChapterContent(page, chapters, true);
  });

  test('shared, materialized, and rejected states survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="tensor-views"]');
    const shared = diagram.locator('.view-card.shared').first();
    const materialized = diagram.locator('.view-card.materialized');
    const rejected = diagram.locator('.error-card').first();
    await expect(shared.locator('.state-symbol')).toHaveText('◇');
    await expect(materialized.locator('.state-symbol')).toHaveText('◆');
    await expect(rejected.locator('.state-symbol')).toHaveText('×');
    expect(await shared.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('solid');
    expect(await materialized.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    await expectNoOverflowOrClientScripts(page);
  });
});
