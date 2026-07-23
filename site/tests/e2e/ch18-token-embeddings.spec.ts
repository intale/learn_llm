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

const chapterId = '18-token-embeddings';
const contentRevision = 2;
const chapterTitle = 'Give token IDs trainable vectors';
const chapterDescription =
  'Build trainable token embeddings in Rust, gather table rows for token IDs, preserve batch and sequence shape, and scatter-add repeated-token gradients.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`X_{b,t,:}=E_{z_{b,t},:},\quad \bar{E}_{i,:}=\sum_{(b,t):z_{b,t}=i}\bar{X}_{b,t,:}`;
const upstreamAdjointLatex = String.raw`\bar{X}_{b,t,:}=\frac{\partial L}{\partial X_{b,t,:}}`;
const tableAdjointLatex = String.raw`\bar{E}_{i,:}=\frac{\partial L}{\partial E_{i,:}}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From sparse identity to the vector entrance of a Transformer';
const historyLimitation =
  'A sparse one-hot word representation assigns one coordinate to each vocabulary item but expresses no graded similarity between words; explicitly carrying that vocabulary-wide vector also wastes work when only one row is needed.';
const historyLater =
  'Bengio et al. learn a shared dense word-feature table jointly with a neural next-word model. The Transformer retains learned token embeddings for subword tokens, then adds positional information before its stacked attention and feed-forward computations.';
const historyModern =
  "The decoder's token IDs enter the numeric model by selecting rows from one trainable [V,d] table. Repeated IDs share the same parameter row, so their reverse contributions add; positional information, embedding forward scaling, attention, and output-weight tying remain later concerns.";
const historyClaims = [
  'Bengio et al. represent the mapping from a vocabulary word index to distributed features as a trainable |V| by m matrix, share it across context positions, and learn it jointly with next-word prediction.',
  'Vaswani et al. use learned d_model-dimensional embeddings for BPE or word-piece tokens and add positional encodings before the Transformer stack; their embedding forward scaling is separate from parameter initialization.',
] as const;
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
] as const;

const expectedRustRegions = [
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'one-hot-baseline'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'known-token-lookup'],
  ['rust/crates/llm-from-scratch/src/nn/embedding.rs', 'embedding-errors'],
  ['rust/crates/llm-from-scratch/src/nn/embedding.rs', 'embedding-layer'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'repeated-token-gradient'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'initialized-token-embedding'],
  ['rust/demos/ch18-token-embeddings/src/main.rs', 'learner-token-embeddings-output'],
  ['rust/demos/ch18-token-embeddings/src/diagram_trace.rs', 'token-embeddings-trace'],
] as const;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 18,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict three selected rows and one shared gradient',
    'Select forward, accumulate backward',
    'Keep vocabulary axes separate from feature axes',
    historyHeading,
    'Wrap one named table around the existing gather rule',
    'Follow selection and accumulation without a second implementation',
    'Predict before checking the executable evidence',
    'Hand the final feature axis to a learned projection',
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
  for (const expected of [historyLimitation, historyLater, historyModern, ...historyClaims]) {
    expect(historyText).toContain(expected);
  }
  expect(historyText).toContain('This is a history of language-model representation');
  expect(historyText).not.toMatch(/Rust history|Python history|TypeScript history/i);
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  const formulae = page.locator('.katex-display');
  await expect(formulae).toHaveCount(1);
  await expect(formulae).toHaveCSS('direction', 'ltr');
  await expect(formulae.locator('annotation[encoding="application/x-tex"]')).toHaveText(
    formulaLatex,
  );
  const inlineAnnotations = page.locator(
    '.lesson-body .katex:not(.katex-display .katex) annotation[encoding="application/x-tex"]',
  );
  const inlineAnnotationText = await inlineAnnotations.allTextContents();
  expect(inlineAnnotationText.filter((text) => text === upstreamAdjointLatex)).toHaveLength(2);
  expect(inlineAnnotationText.filter((text) => text === tableAdjointLatex)).toHaveLength(2);
  await expect(page.locator('.lesson-body code').filter({ hasText: /^bar [XE]$/ })).toHaveCount(0);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
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

  await expectVisualizationDecision(page, { decision: 'useful', id: 'token-embeddings' });
  const diagram = page.locator('figure[data-visualization-id="token-embeddings"]');
  await expect(diagram).toHaveAccessibleName('Follow repeated token IDs through one shared table');
  await expect(diagram).toHaveAccessibleDescription(
    'Read the exact Rust-authored token IDs, table rows, one-hot lookup equivalence, output vectors, and reverse contributions that accumulate into the shared embedding table.',
  );
  await expect(diagram.locator('.shape-summary dd')).toHaveText([
    'token_embedding.weight',
    '4',
    '2',
    '[4, 2]',
    '[1, 3]',
    '[1, 3, 2]',
    '[4, 2]',
  ]);

  expect(
    await diagram.locator('.ids-stage tbody tr').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.children, (cell) => cell.textContent?.trim() ?? '')),
    ),
  ).toEqual([
    ['(0, 0)', '2', 'Shares row 2 with another position'],
    ['(0, 1)', '1', 'Selects one singly used row'],
    ['(0, 2)', '2', 'Shares row 2 with another position'],
  ]);
  expect(
    await diagram.locator('.table-stage tbody tr').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.children, (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')),
    ),
  ).toEqual([
    ['E[0, :]', '[10.000000000000, 11.000000000000]', '0', '○ Unused row'],
    ['E[1, :]', '[20.000000000000, 21.000000000000]', '1', '● Selected once'],
    ['E[2, :]', '[30.000000000000, 31.000000000000]', '2', '◆ Shared by repeated ID 2'],
    ['E[3, :]', '[40.000000000000, 41.000000000000]', '0', '○ Unused row'],
  ]);

  const lookupRows = await diagram.locator('.lookup-stage tbody tr').evaluateAll((rows) =>
    rows.map((row) => Array.from(row.children, (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')),
  );
  expect(lookupRows).toEqual([
    ['(0, 0)', '2', '[0, 0, 1, 0]', 'e2 E', 'E[2, :]', '[30.000000000000, 31.000000000000]', '[1.000000000000, 0.000000000000]'],
    ['(0, 1)', '1', '[0, 1, 0, 0]', 'e1 E', 'E[1, :]', '[20.000000000000, 21.000000000000]', '[0.000000000000, 2.000000000000]'],
    ['(0, 2)', '2', '[0, 0, 1, 0]', 'e2 E', 'E[2, :]', '[30.000000000000, 31.000000000000]', '[3.000000000000, 4.000000000000]'],
  ]);
  expect(
    await diagram.locator('.gradient-stage tbody tr').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.children, (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')),
    ),
  ).toEqual([
    ['E[0, :]', 'None', 'None', 'No selection; keep zero', '[0.000000000000, 0.000000000000]'],
    ['E[1, :]', '1', '[0.000000000000, 2.000000000000]', 'One selection; copy its contribution', '[0.000000000000, 2.000000000000]'],
    ['E[2, :]', '0, 2', '[1.000000000000, 0.000000000000] + [3.000000000000, 4.000000000000]', 'Repeated selections; add both contributions', '[4.000000000000, 4.000000000000]'],
    ['E[3, :]', 'None', 'None', 'No selection; keep zero', '[0.000000000000, 0.000000000000]'],
  ]);

  const scrollers = diagram.locator('.table-scroll');
  await expect(scrollers).toHaveCount(4);
  const scrollerNames = [
    'Scrollable token-ID positions',
    'Scrollable embedding table',
    'Scrollable one-hot and lookup evidence',
    'Scrollable table-gradient accumulation evidence',
  ];
  for (const [index, scroller] of (await scrollers.all()).entries()) {
    await expect(scroller).toHaveAttribute('role', 'region');
    await expect(scroller).toHaveAccessibleName(scrollerNames[index]);
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
  await expect(diagram.locator('.stage-grid')).toHaveCSS('align-items', 'start');
  await expect(diagram).toHaveCSS('color', 'rgb(22, 33, 29)');
  await expect(diagram).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.68)');
  await expect(diagram.locator('.diagram-stage').first()).toHaveCSS('color', 'rgb(22, 33, 29)');
  await expect(diagram.locator('.diagram-stage').first()).toHaveCSS(
    'background-color',
    'rgba(255, 255, 255, 0.68)',
  );
  const containment = await diagram.evaluate((node) => ({
    figure: { client: node.clientWidth, scroll: node.scrollWidth },
    parameter: (() => {
      const card = node.querySelector<HTMLElement>('.shape-summary > div:first-child')!;
      return { client: card.clientWidth, scroll: card.scrollWidth };
    })(),
    stages: Array.from(node.querySelectorAll<HTMLElement>('.diagram-stage')).map((stage) => ({
      client: stage.clientWidth,
      scroll: stage.scrollWidth,
    })),
  }));
  for (const region of [containment.figure, containment.parameter, ...containment.stages]) {
    expect(region.scroll).toBeLessThanOrEqual(region.client);
  }
  const heightEvidence = await diagram.locator('.diagram-stage').evaluateAll((stages) =>
    stages.map((stage) => ({ offset: (stage as HTMLElement).offsetHeight, scroll: (stage as HTMLElement).scrollHeight })),
  );
  for (const { offset, scroll } of heightEvidence) {
    expect(Math.abs(offset - scroll)).toBeLessThanOrEqual(3);
  }
  const stagePositions = await diagram.locator('.stage-grid .diagram-stage').evaluateAll((stages) =>
    stages.map((stage) => {
      const rectangle = stage.getBoundingClientRect();
      return { left: rectangle.left, top: rectangle.top, bottom: rectangle.bottom };
    }),
  );
  expect(Math.abs(stagePositions[0]!.left - stagePositions[1]!.left)).toBeLessThan(1);
  expect(stagePositions[1]!.top).toBeGreaterThan(stagePositions[0]!.bottom);
  if (narrow) {
    for (const selector of ['.lookup-scroll', '.gradient-stage .table-scroll']) {
      const widths = await diagram.locator(selector).evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(10);

  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 18 token-embeddings vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 18 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(18);
    expect(englishChapters[17]).toEqual(
      expect.objectContaining({ chapterId, order: 18, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '17-parameter-initialization'));
    await expectOrderedChapterNavigation(page, 'en', '17-parameter-initialization', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 18,
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
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveCount(0);

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

  test('repeated, single-use, and unused rows survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="token-embeddings"]');
    await expect(diagram.locator('.state-unused .state-symbol').first()).toHaveText('○');
    await expect(diagram.locator('.state-selected-once .state-symbol')).toHaveText('●');
    await expect(diagram.locator('.state-selected-repeated .state-symbol')).toHaveText('◆');
    expect(
      await diagram.locator('.state-unused td').first().evaluate((node) =>
        window.getComputedStyle(node).borderBottomStyle),
    ).toBe('dotted');
    expect(
      await diagram.locator('.state-selected-repeated td').first().evaluate((node) =>
        window.getComputedStyle(node).borderBottomStyle),
    ).toBe('double');
    await expectNoOverflowOrClientScripts(page);
  });

  test('localized labels inherit RTL while technical vectors remain left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="token-embeddings"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));

    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
    await expect(diagram.locator('.ids-stage tbody td').last()).toHaveCSS('direction', 'rtl');
    expect(
      await diagram.locator('bdi[dir="ltr"]').evaluateAll((nodes) =>
        nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    await expect(diagram.locator('[dir="ltr"]:not(bdi)')).toHaveCount(0);
    await expectNoOverflowOrClientScripts(page);
  });

  test('the complete lesson and trace tables render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('.ids-stage tbody tr')).toHaveCount(3);
    await expect(page.locator('.table-stage tbody tr')).toHaveCount(4);
    await expect(page.locator('.lookup-stage tbody tr')).toHaveCount(3);
    await expect(page.locator('.gradient-stage tbody tr')).toHaveCount(4);
    await expect(page.locator('.rule-repeated-sum').last()).toContainText('[4.000000000000, 4.000000000000]');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
