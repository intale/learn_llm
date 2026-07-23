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

const chapterId = '19-linear-layers';
const contentRevision = 1;
const chapterTitle = "Mix each token's features with one learned projection";
const chapterDescription =
  'Build a trainable linear layer in Rust, preserve leading token axes, compare affine and bias-free projections, and verify exact reverse gradients.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`Y=XW+b`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From adaptive responses to projections throughout a Transformer';
const historyLimitation =
  'One scalar weighted response is local arithmetic inside an adaptive system, but a language model needs vectors of hidden activations and vocabulary-wide scores at every context position; treating every output as a separate scalar unit hides the shared matrix computation.';
const historyLater =
  'Bengio et al. express hidden and output computation in a neural language model with trainable matrices and additive biases. The Transformer then reuses learned projections for queries, keys, values, attention outputs, position-wise feed-forward transformations, and next-token scoring.';
const historyModern =
  'A decoder applies the same learned feature projection independently at every batch and sequence position. This course keeps bias available for the historical affine form, while its target attention, SwiGLU, and vocabulary projections deliberately use the bias-free form.';
const historyClaims = [
  "Rosenblatt describes an adaptive response architecture in which summed excitatory and inhibitory signals and reinforcement influence the selected response. This supports the early adaptive-response context, not this course's affine formula or API.",
  'Bengio et al. compute unnormalized next-word scores with y=b+Wx+U tanh(d+Hx), making trainable matrix products and additive biases explicit inside a neural language model.',
  'Vaswani et al. learn separate linear projections for queries, keys, and values, project concatenated heads again, apply two linear transformations identically at each feed-forward position, and use a learned pre-softmax projection.',
] as const;
const historySources = [
  'https://doi.org/10.1037/h0042519',
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
] as const;

const expectedRustRegions = [
  ['rust/demos/ch19-linear-layers/src/lib.rs', 'scalar-weighted-unit'],
  ['rust/demos/ch19-linear-layers/src/lib.rs', 'known-linear-layer'],
  ['rust/crates/llm-from-scratch/src/nn/linear.rs', 'linear-errors'],
  ['rust/crates/llm-from-scratch/src/nn/linear.rs', 'linear-layer'],
  ['rust/demos/ch19-linear-layers/src/lib.rs', 'linear-gradients'],
  ['rust/demos/ch19-linear-layers/src/lib.rs', 'initialized-linear-layer'],
  ['rust/demos/ch19-linear-layers/src/main.rs', 'learner-linear-layers-output'],
  ['rust/demos/ch19-linear-layers/src/diagram_trace.rs', 'linear-layers-trace'],
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
    order: 19,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict two outputs from one shared matrix',
    'Project the final feature axis',
    'Keep leading axes separate from feature axes',
    historyHeading,
    'Wrap existing differentiable operations in one named layer',
    'Trace positions, products, policy, and gradients',
    'Predict before checking the executable evidence',
    'Hand reusable projections to the first gated block',
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
  expect(historyText).toContain('road from earlier neural computation to modern language models');
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
  const formulaSpacing = await formulae.evaluate((formula) => {
    const formulaBox = formula.getBoundingClientRect();
    const previous = formula.previousElementSibling;
    const next = formula.nextElementSibling;
    const previousBox = previous?.getBoundingClientRect();
    const nextBox = next?.getBoundingClientRect();
    return {
      formulaTop: formulaBox.top,
      formulaBottom: formulaBox.bottom,
      previousBottom: previousBox?.bottom ?? Number.NEGATIVE_INFINITY,
      nextTop: nextBox?.top ?? Number.POSITIVE_INFINITY,
    };
  });
  expect(formulaSpacing.previousBottom).toBeLessThan(formulaSpacing.formulaTop);
  expect(formulaSpacing.formulaBottom).toBeLessThan(formulaSpacing.nextTop);

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
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }

  await expectVisualizationDecision(page, { decision: 'useful', id: 'linear-layers' });
  const diagram = page.locator('figure[data-visualization-id="linear-layers"]');
  await expect(diagram).toHaveAccessibleName(
    'Follow one shared projection across two token positions',
  );
  await expect(diagram).toHaveAccessibleDescription(
    'Read exact Rust-authored shapes, shared weights, per-output contributions, affine and bias-free results, and gradients accumulated across both positions.',
  );
  await expect(diagram.locator('.shape-summary dd')).toHaveText([
    'token_projection.weight',
    '2',
    '3',
    'Enabled',
    '9',
    '[1, 2, 2]',
    '[1, 2, 3]',
    '[1, 2, 3]',
  ]);

  expect(
    await diagram.locator('.weights-stage tbody tr').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.children, (cell) => cell.textContent?.trim() ?? '')),
    ),
  ).toEqual([
    ['0', '[1.000000000000, 0.000000000000, -1.000000000000]'],
    ['1', '[2.000000000000, 0.500000000000, 1.000000000000]'],
    ['Bias', '[0.500000000000, -0.500000000000, 1.000000000000]'],
  ]);
  expect(
    await diagram.locator('.positions-stage tbody tr').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.children, (cell) => cell.textContent?.trim() ?? '')),
    ),
  ).toEqual([
    ['0', '(0, 0)', '[1.000000000000, 2.000000000000]', '0', '5.500000000000'],
    ['0', '(0, 0)', '[1.000000000000, 2.000000000000]', '1', '0.500000000000'],
    ['0', '(0, 0)', '[1.000000000000, 2.000000000000]', '2', '2.000000000000'],
    ['1', '(0, 1)', '[-1.000000000000, 3.000000000000]', '0', '5.500000000000'],
    ['1', '(0, 1)', '[-1.000000000000, 3.000000000000]', '1', '1.000000000000'],
    ['1', '(0, 1)', '[-1.000000000000, 3.000000000000]', '2', '5.000000000000'],
  ]);
  await expect(diagram.locator('.contribution-grid dd')).toHaveText([
    '(0, 0), y[0]',
    '1.000000000000 × 1.000000000000 + 2.000000000000 × 2.000000000000',
    '5.000000000000',
    '+ 0.500000000000',
    '= 5.500000000000',
  ]);
  await expect(diagram.locator('.policy-grid article')).toHaveCount(2);
  await expect(diagram.locator('.affine-policy')).toContainText(
    '[5.500000000000, 0.500000000000, 2.000000000000]; [5.500000000000, 1.000000000000, 5.000000000000]',
  );
  await expect(diagram.locator('.bias-free-policy')).toContainText(
    '[5.000000000000, 1.000000000000, 1.000000000000]; [5.000000000000, 1.500000000000, 4.000000000000]',
  );
  expect(
    await diagram.locator('.gradients-stage tbody tr').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.children, (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')),
    ),
  ).toEqual([
    ['dX[0]', '(0, 0)', '[1.000000000000, 0.000000000000, -1.000000000000]', '[2.000000000000, 1.000000000000]'],
    ['dX[1]', '(0, 1)', '[0.500000000000, 2.000000000000, 1.000000000000]', '[-0.500000000000, 3.000000000000]'],
    ['dW', 'dW=sum_p X_p^T G_p', '[2, 3] [0.500000000000, -2.000000000000, -2.000000000000, 3.500000000000, 6.000000000000, 1.000000000000]'],
    ['db', 'db=sum_p G_p', '[3] [1.500000000000, 2.000000000000, 0.000000000000]'],
  ]);
  await expect(diagram.locator('.position-gradient-table')).toHaveAccessibleName(
    'Gradients returned to individual positions',
  );
  await expect(diagram.locator('.parameter-gradient-table')).toHaveAccessibleName(
    'Gradients accumulated into shared parameters',
  );

  const scrollers = diagram.locator('.table-scroll');
  await expect(scrollers).toHaveCount(3);
  const scrollerNames = [
    'Scrollable linear-layer weight and bias evidence',
    'Scrollable position-by-position projection evidence',
    'Scrollable linear-layer gradient evidence',
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
  const containment = await diagram.evaluate((node) => ({
    figure: { client: node.clientWidth, scroll: node.scrollWidth },
    stages: Array.from(node.querySelectorAll<HTMLElement>('.diagram-stage')).map((stage) => ({
      client: stage.clientWidth,
      scroll: stage.scrollWidth,
      offsetHeight: stage.offsetHeight,
      scrollHeight: stage.scrollHeight,
    })),
  }));
  expect(containment.figure.scroll).toBeLessThanOrEqual(containment.figure.client);
  for (const stage of containment.stages) {
    expect(stage.scroll).toBeLessThanOrEqual(stage.client);
    expect(Math.abs(stage.offsetHeight - stage.scrollHeight)).toBeLessThanOrEqual(3);
  }
  if (narrow) {
    for (const selector of ['.positions-stage .table-scroll', '.gradients-stage .table-scroll']) {
      const widths = await diagram.locator(selector).evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
    const axisPositions = await diagram.locator('.axis-flow > *').evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
    expect(axisPositions[1]).toBeGreaterThan(axisPositions[0]);
    expect(axisPositions[2]).toBeGreaterThan(axisPositions[1]);
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 19 linear-layers vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 19 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(19);
    expect(englishChapters[18]).toEqual(
      expect.objectContaining({ chapterId, order: 19, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '18-token-embeddings'));
    await expectOrderedChapterNavigation(page, 'en', '18-token-embeddings', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    const russianSwitch = page.locator('.locale-switch a[data-locale="ru"]');
    await expect(russianSwitch).toHaveAttribute('href', '/ru/course/');
    await expect(russianSwitch).toHaveAttribute('data-locale-fallback', 'course-index');
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

  test('affine and bias-free policies remain distinct in forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="linear-layers"]');
    await expect(diagram.locator('.affine-policy')).toContainText('+b');
    await expect(diagram.locator('.bias-free-policy')).toContainText('W only');
    expect(
      await diagram.locator('.affine-policy').evaluate((node) =>
        window.getComputedStyle(node).borderLeftStyle),
    ).toBe('solid');
    expect(
      await diagram.locator('.bias-free-policy').evaluate((node) =>
        window.getComputedStyle(node).borderLeftStyle),
    ).toBe('double');
    await expectNoOverflowOrClientScripts(page);
  });

  test('localized labels inherit RTL while technical values remain left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="linear-layers"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));

    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
    await expect(diagram.locator('.positions-stage thead th').first()).toHaveCSS('direction', 'rtl');
    expect(
      await diagram.locator('bdi[dir="ltr"]').evaluateAll((nodes) =>
        nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    await expect(diagram.locator('[dir="ltr"]:not(bdi)')).toHaveCount(0);
    await expectNoOverflowOrClientScripts(page);
  });

  test('the lesson and exact trace tables render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('.weights-stage tbody tr')).toHaveCount(3);
    await expect(page.locator('.positions-stage tbody tr')).toHaveCount(6);
    await expect(page.locator('.gradients-stage tbody tr')).toHaveCount(4);
    await expect(page.locator('.bias-free-policy')).toContainText('4.000000000000');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
