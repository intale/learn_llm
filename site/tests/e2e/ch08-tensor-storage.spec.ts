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
  readMathAwareText,
  readOrderedCourseChapters,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '08-tensor-storage';
const contentRevision = 4;
const chapterTitle = 'From tensor coordinates to one flat buffer';
const chapterDescription =
  'Map language-model matrices and attention tensors onto one flat Rust vector with checked row-major strides and deterministic offsets.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`\operatorname{offset}(i_0,\ldots,i_{d-1})=\sum_{k=0}^{d-1} i_k s_k`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From bigram counts to learned matrices and attention tensors';
const historyLimitation =
  'The Chapter 6 bigram gives each current-token and next-token pair its own count and uses only one token of context, so it cannot share evidence through learned word similarity.';
const bengioClaim =
  'Bengio et al. describe n-gram models as short-context conditional-probability tables that do not use word similarity, then define a neural language model with a vocabulary-size-by-feature-width matrix C of learned word features and neural parameter matrices for next-word prediction.';
const vaswaniClaim =
  'Vaswani et al. later pack simultaneous queries, keys, and values into matrices Q, K, and V and use learned projections to run multiple attention heads in parallel before concatenating their outputs.';
const modernLlmRole =
  'Explicit tensor shapes let this course represent embeddings, learned weights, activations, and attention intermediates in the cumulative decoder; the single contiguous row-major buffer is a local implementation policy, not a requirement of either paper.';
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf',
] as const;

const diagramCopy = {
  title: 'One coordinate, one row-major offset',
  description:
    'Two slices with two rows and three columns, plus one flat buffer, come from the same Rust fixture. Follow [1, 0, 2] through its three stride contributions, then compare the checked out-of-bounds coordinate.',
  sections: [
    'Two slices from one rank-3 tensor',
    'Turn [1, 0, 2] into offset 8',
    'Find offset 8 in the flat buffer',
    'Reject an invalid coordinate before access',
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
  ['rust/crates/llm-from-scratch/src/tensor/storage.rs', 'tensor-storage-invariants'],
  ['rust/crates/llm-from-scratch/src/tensor/storage.rs', 'row-major-indexing'],
  ['rust/demos/ch08-tensor-storage/src/lib.rs', 'llm-shape-history'],
  ['rust/demos/ch08-tensor-storage/src/lib.rs', 'frozen-tensor-fixture'],
  ['rust/demos/ch08-tensor-storage/src/main.rs', 'learner-output'],
  ['rust/demos/ch08-tensor-storage/src/diagram_trace.rs', 'tensor-storage-trace'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) => readRustRegion(path, region));

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 8,
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
    'Predict one address before flattening the picture',
    'Turn each axis movement into one stride term',
    'Locate every symbol in the tensor',
    historyHeading,
    'Make shape validity and indexing one checked responsibility',
    'Follow the coordinate through slices, arithmetic, and storage',
    'Predict each layout result before checking it',
    'Reuse one checked numeric container throughout the model',
  ]);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${historyHeading}"]]`,
    );
  const historyText = await readMathAwareText(historyNodes);
  expect(historyText).toContain(historyLimitation);
  expect(historyText).toContain(`${bengioClaim} ${vaswaniClaim}`);
  expect(historyText).toContain(bengioClaim);
  expect(historyText).toContain(vaswaniClaim);
  expect(historyText).toContain(modernLlmRole);
  expect(historyText).not.toMatch(/FORTRAN|Iliffe|Genie|NumPy/);
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(
    historySources,
  );

  const formula = page
    .locator('.katex-display')
    .filter({ has: page.locator('annotation[encoding="application/x-tex"]', { hasText: formulaLatex }) });
  await expect(formula).toHaveCount(1);
  await expect(formula).toHaveCSS('direction', 'ltr');
  await expect(formula.locator('annotation[encoding="application/x-tex"]')).toHaveText(formulaLatex);

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

  await expectVisualizationDecision(page, { decision: 'useful', id: 'tensor-storage' });
  const diagram = page.locator('figure[data-visualization-id="tensor-storage"]');
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(diagram.locator('.summary-facts dt')).toHaveText([
    'Shape',
    'Row-major strides',
    'Stored values',
  ]);
  await expect(diagram.locator('.summary-facts dd')).toHaveText(['[2, 2, 3]', '[6, 3, 1]', '12']);

  expect(
    await diagram.locator('[data-slice-axis0]').evaluateAll((slices) =>
      slices.map((slice) => ({
        axis0: slice.getAttribute('data-slice-axis0'),
        rows: Array.from(slice.querySelectorAll('tbody tr')).map((row) =>
          Array.from(row.querySelectorAll('td')).map((cell) => ({
            value: cell.querySelector('bdi')?.textContent?.trim(),
            selected: cell.getAttribute('data-selected'),
          })),
        ),
      })),
    ),
  ).toEqual([
    {
      axis0: '0',
      rows: [
        [{ value: '10.0', selected: null }, { value: '11.0', selected: null }, { value: '12.0', selected: null }],
        [{ value: '20.0', selected: null }, { value: '21.0', selected: null }, { value: '22.0', selected: null }],
      ],
    },
    {
      axis0: '1',
      rows: [
        [{ value: '30.0', selected: null }, { value: '31.0', selected: null }, { value: '32.0', selected: 'true' }],
        [{ value: '40.0', selected: null }, { value: '41.0', selected: null }, { value: '42.0', selected: null }],
      ],
    },
  ]);

  expect(
    await diagram.locator('[data-term-axis]').evaluateAll((terms) =>
      terms.map((term) => ({
        axis: term.getAttribute('data-term-axis'),
        contribution: term.querySelector('[data-contribution]')?.getAttribute('data-contribution'),
      })),
    ),
  ).toEqual([
    { axis: '0', contribution: '6' },
    { axis: '1', contribution: '0' },
    { axis: '2', contribution: '2' },
  ]);
  await expect(diagram.locator('[data-lookup-offset="8"] dt')).toHaveText(['Offset', 'Value']);
  await expect(diagram.locator('[data-lookup-offset="8"] dd')).toHaveText(['8', '32.0']);

  const buffer = diagram.locator('[data-buffer-offset]');
  await expect(buffer).toHaveCount(12);
  expect(
    await buffer.evaluateAll((cells) =>
      cells.map((cell) => ({
        offset: cell.getAttribute('data-buffer-offset'),
        value: cell.querySelector('[data-buffer-value]')?.getAttribute('data-buffer-value'),
        selected: cell.getAttribute('data-selected'),
      })),
    ),
  ).toEqual([
    ['10.0', '11.0', '12.0', '20.0', '21.0', '22.0', '30.0', '31.0', '32.0', '40.0', '41.0', '42.0']
      .map((value, offset) => ({ offset: String(offset), value, selected: offset === 8 ? 'true' : null })),
  ].flat());
  await expect(diagram.locator('[data-selected="true"]')).toHaveCount(2);
  await expect(diagram.locator('.selection-marker')).toHaveText(['◆', '◆']);

  const bounds = diagram.locator('[data-status="out-of-bounds"]');
  await expect(bounds.locator('.bounds-facts dt')).toHaveText([
    'Coordinate',
    'Axis',
    'Index',
    'Axis size',
  ]);
  await expect(bounds.locator('.bounds-facts dd')).toHaveText(['[1, 2, 0]', '1', '2', '2']);
  await expect(bounds.locator('[data-bounds-axis]')).toHaveAttribute('data-bounds-axis', '1');
  await expect(bounds.locator('[data-bounds-index]')).toHaveAttribute('data-bounds-index', '2');
  await expect(bounds.locator('[data-bounds-size]')).toHaveAttribute('data-bounds-size', '2');

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  for (const region of [diagram.locator('.table-scroll').first(), diagram.locator('.buffer-scroll')]) {
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

test.describe('chapter 8 tensor-storage vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('English includes Chapter 8 while Russian remains complete through Chapter 7', async ({ page }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(8);
    expect(englishChapters[7]).toEqual(
      expect.objectContaining({ chapterId, order: 8, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '07-language-model-metrics'));
    await expectOrderedChapterNavigation(
      page,
      'en',
      '07-language-model-metrics',
      englishChapters,
    );
    await page.goto(chapterPath('ru', '07-language-model-metrics'));
    await expectOrderedChapterNavigation(
      page,
      'ru',
      '07-language-model-metrics',
      russianChapters,
    );

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 8,
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

  test('selected and invalid states remain distinguishable in forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="tensor-storage"]');
    const selected = diagram.locator('[data-selected="true"]').first();
    const bounds = diagram.locator('[data-status="out-of-bounds"]');
    await expect(selected.locator('.selection-marker')).toHaveText('◆');
    expect(await selected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await bounds.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    await expect(bounds).toContainText('Axis 1 has size 2');
    await expectNoOverflowOrClientScripts(page);
  });
});
