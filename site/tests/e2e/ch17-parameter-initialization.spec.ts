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

const chapterId = '17-parameter-initialization';
const contentRevision = 2;
const chapterTitle = 'Initialize every trainable tensor reproducibly';
const chapterDescription =
  'Initialize model parameters reproducibly in Rust, compare zero, oversized, and Xavier scales, and track expected variance through stacked linear layers.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`\operatorname{Var}(W_{ij})=\frac{2}{\operatorname{fan}_{in}+\operatorname{fan}_{out}}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From neural word features to width-aware decoder parameters';
const historyLimitation =
  'Bengio et al. jointly learn word features and neural matrices for next-word prediction and report random word-feature initialization similar to neural-network weight initialization. Their paper does not define a dimension-aware or reproducible initialization rule; arbitrary scales become more consequential when learned transformations are composed through depth.';
const historyLater =
  'Glorot and Bengio derive a normalized variance compromise for deep feed-forward networks under explicit near-linear and independence assumptions. Vaswani et al. later assemble learned embeddings, attention projections, output projections, and feed-forward matrices into repeated Transformer layers, making many width-dependent trainable tensors part of one language model.';
const historyModern =
  "This chapter gives later decoder parameters distinct deterministic values, stable names, and a declared width-aware target variance. Applying Xavier-style uniform initialization to this small SiLU, RMSNorm, and residual decoder is a transparent course policy, not a claim that the original Transformer specified it or that every signal will preserve variance exactly.";
const historyClaims = [
  'Bengio et al. define a learned word-feature matrix and neural parameter matrices for next-word prediction, optimize them jointly, and report random initialization of the word features similarly to neural-network weights.',
  'Glorot and Bengio balance fan-in and fan-out variance conditions under stated simplifying assumptions, yielding target variance 2 divided by their sum and a normalized zero-centered uniform initialization.',
  'Vaswani et al. build repeated Transformer layers from learned embeddings, query/key/value and output projections, and two learned feed-forward transformations; the paper does not prescribe a parameter initializer.',
] as const;
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
] as const;

const expectedRustRegions = [
  ['rust/demos/ch17-parameter-initialization/src/lib.rs', 'zero-symmetry-probe'],
  ['rust/crates/llm-from-scratch/src/nn/init.rs', 'parameter-init-errors'],
  ['rust/crates/llm-from-scratch/src/nn/init.rs', 'deterministic-prng'],
  ['rust/crates/llm-from-scratch/src/nn/init.rs', 'xavier-initialization'],
  ['rust/crates/llm-from-scratch/src/nn/init.rs', 'named-parameters'],
  ['rust/demos/ch17-parameter-initialization/src/lib.rs', 'fixed-seed-parameter'],
  ['rust/demos/ch17-parameter-initialization/src/lib.rs', 'named-parameter-enumeration'],
  ['rust/demos/ch17-parameter-initialization/src/lib.rs', 'initialization-errors-example'],
  [
    'rust/demos/ch17-parameter-initialization/src/main.rs',
    'learner-parameter-initialization-output',
  ],
  [
    'rust/demos/ch17-parameter-initialization/src/diagram_trace.rs',
    'parameter-initialization-trace',
  ],
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
    order: 17,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict one seed, scale, and symmetry failure',
    'Target a distribution, not one exact finite sample',
    'Name the weight and both widths',
    historyHeading,
    'Generate and name parameters transactionally',
    'Compare fixed-seed distributions and expected variance',
    'Predict before running Rust',
    'Give initialization meaning as a token table',
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
  expect(historyText).toContain(
    'Its attention-score and embedding scaling are forward computations, not evidence for Xavier initialization.',
  );
  expect(historyText).toContain('The progression is about trainable language models');
  expect(historyText).not.toMatch(/Rust history|Python history|TypeScript history/i);
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  const formulae = page.locator('.katex-display');
  expect(await formulae.count()).toBeGreaterThan(0);
  expect(
    await formulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).not.toContain('rtl');
  expect(
    await formulae.locator('annotation[encoding="application/x-tex"]').allTextContents(),
  ).toContain(formulaLatex);

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

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'parameter-initialization',
  });
  const diagram = page.locator('figure[data-visualization-id="parameter-initialization"]');
  await expect(diagram).toHaveAccessibleName('Compare one seed across three starting scales');
  await expect(diagram).toHaveAccessibleDescription(
    'Inspect exact Rust-authored histograms for zero, oversized, and Xavier-style weights, then follow their assumption-bound expected variance through four linear layers.',
  );
  await expect(diagram).toHaveCSS('color', 'rgb(22, 33, 29)');
  await expect(diagram).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.68)');
  await expect(diagram).toHaveCSS('overflow-x', 'hidden');
  await expect(diagram.locator('dt').first()).toHaveCSS('color', 'rgb(82, 100, 92)');
  await expect(diagram.locator('.summary-grid')).toHaveAttribute('data-seed', '17');
  await expect(diagram.locator('.summary-grid')).toHaveAttribute('data-shape', '64x64');
  await expect(diagram.locator('.summary-grid')).toHaveAttribute('data-samples', '4096');
  await expect(diagram.locator('.summary-grid')).toHaveAttribute(
    'data-generator',
    'splitmix64',
  );

  const distributions = diagram.locator('[data-initialization-kind]');
  await expect(distributions).toHaveCount(3);
  await expect(distributions.first()).toHaveCSS(
    'background-color',
    'rgba(255, 255, 255, 0.68)',
  );
  expect(
    await distributions.evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-initialization-kind'),
        seed: card.getAttribute('data-seed'),
        limit: card.getAttribute('data-limit'),
        mean: card.getAttribute('data-mean'),
        variance: card.getAttribute('data-variance'),
        counts: card.getAttribute('data-counts'),
        bars: card.getAttribute('data-bar-percent'),
      })),
    ),
  ).toEqual([
    {
      kind: 'zero',
      seed: 'none',
      limit: '0.000000000000',
      mean: '0.000000000000',
      variance: '0.000000000000',
      counts: '0,0,0,0,4096,0,0,0,0',
      bars:
        '0.000000000000,0.000000000000,0.000000000000,0.000000000000,100.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000',
    },
    {
      kind: 'oversized',
      seed: '17',
      limit: '0.433012701892',
      mean: '-0.006738057131',
      variance: '0.063205643939',
      counts: '409,498,482,472,469,445,476,443,402',
      bars:
        '9.985351562500,12.158203125000,11.767578125000,11.523437500000,11.450195312500,10.864257812500,11.621093750000,10.815429687500,9.814453125000',
    },
    {
      kind: 'xavier',
      seed: '17',
      limit: '0.216506350946',
      mean: '-0.003369028566',
      variance: '0.015801410985',
      counts: '0,0,674,962,919,930,611,0,0',
      bars:
        '0.000000000000,0.000000000000,16.455078125000,23.486328125000,22.436523437500,22.705078125000,14.916992187500,0.000000000000,0.000000000000',
    },
  ]);
  for (const card of await distributions.all()) {
    await expect(card.locator('[data-bin-index]')).toHaveCount(9);
  }
  const containment = await diagram.evaluate((node) => ({
    figure: { client: node.clientWidth, scroll: node.scrollWidth },
    cards: Array.from(node.querySelectorAll<HTMLElement>('[data-initialization-kind]')).map(
      (card) => ({ client: card.clientWidth, scroll: card.scrollWidth }),
    ),
  }));
  expect(containment.figure.scroll).toBeLessThanOrEqual(containment.figure.client);
  for (const card of containment.cards) {
    expect(card.scroll).toBeLessThanOrEqual(card.client);
  }
  const representativeBin = diagram
    .locator('[data-initialization-kind="xavier"] [data-bin-index="3"]');
  await expect(representativeBin.locator('.bin-range .visually-hidden')).toHaveText(
    'Bin range:',
  );
  await expect(
    representativeBin.locator('.bin-range annotation[encoding="application/x-tex"]'),
  ).toHaveText(String.raw`\left[-0.150000000000,-0.050000000000\right)`);
  await expect(representativeBin.locator('.bin-count .visually-hidden')).toHaveText(
    'Count:',
  );
  await expect(representativeBin.locator('.bin-count bdi')).toHaveText('962');
  await expect(representativeBin.locator('.bin-share .visually-hidden')).toHaveText(
    'Share of samples:',
  );
  await expect(representativeBin.locator('.bin-share bdi')).toHaveText(
    '23.486328125000%',
  );
  const renderedBar = await representativeBin.evaluate((node) => {
    const track = node.querySelector<HTMLElement>('.bin-bar');
    const fill = track?.firstElementChild as HTMLElement | null;
    if (!track || !fill || track.clientWidth === 0) {
      throw new Error('Representative histogram bar must be rendered with a nonzero track.');
    }
    return {
      authoredPercent: (node as HTMLElement).style.getPropertyValue('--bar-percent').trim(),
      renderedPercent: (fill.getBoundingClientRect().width / track.clientWidth) * 100,
    };
  });
  expect(renderedBar.authoredPercent).toBe('23.486328125000%');
  expect(renderedBar.renderedPercent).toBeCloseTo(23.486328125, 1);
  await expect(diagram.locator('.pairing-note')).toHaveAttribute(
    'data-base-draws-equal',
    'yes',
  );
  await expect(diagram.locator('.pairing-note')).toHaveAttribute(
    'data-limit-ratio',
    '2.000000000000',
  );

  expect(
    await diagram.locator('.propagation-section tbody tr').evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.children, (cell) => cell.textContent?.trim() ?? ''),
      ),
    ),
  ).toEqual([
    ['0', '1.000000000000', '1.000000000000', '1.000000000000'],
    ['1', '0.000000000000', '4.000000000000', '1.000000000000'],
    ['2', '0.000000000000', '16.000000000000', '1.000000000000'],
    ['3', '0.000000000000', '64.000000000000', '1.000000000000'],
    ['4', '0.000000000000', '256.000000000000', '1.000000000000'],
  ]);
  await expect(diagram.locator('.propagation-section tbody [data-variance]')).toHaveCount(15);
  await expect(diagram.locator('[data-reproducibility="same-seed"]')).toHaveAttribute(
    'data-result',
    'yes',
  );
  await expect(
    diagram.locator('[data-reproducibility="alternate-seed"]'),
  ).toHaveAttribute('data-result', 'yes');

  const scroller = diagram.locator('.table-scroll');
  await expect(scroller).toHaveCount(1);
  await scroller.focus();
  await expect(scroller).toBeFocused();
  await expect(diagram.locator('.distribution-grid')).toHaveCSS('align-items', 'start');
  const positions = await distributions.evaluateAll((cards) =>
    cards.map((card) => {
      const rectangle = card.getBoundingClientRect();
      return { left: rectangle.left, top: rectangle.top, bottom: rectangle.bottom };
    }),
  );
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    expect(positions).toHaveLength(3);
    expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
    expect(Math.abs(positions[1]!.left - positions[2]!.left)).toBeLessThan(1);
    expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    expect(positions[2]!.top).toBeGreaterThan(positions[1]!.bottom);
  } else {
    expect(new Set(positions.map(({ top }) => Math.round(top))).size).toBeGreaterThan(1);
  }

  expect(
    await diagram.locator('code, bdi, [dir="ltr"]').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(10);

  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 17 parameter-initialization vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 17 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(17);
    expect(englishChapters[16]).toEqual(
      expect.objectContaining({ chapterId, order: 17, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '16-model-autodiff-ops'));
    await expectOrderedChapterNavigation(page, 'en', '16-model-autodiff-ops', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 17,
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

  test('the complete Rust-backed lesson renders at desktop and narrow widths', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const chapters = await readOrderedCourseChapters(page, 'en');
    await page.goto(chapterPath('en', chapterId));
    await expectChapterContent(page, chapters, false);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectChapterContent(page, chapters, true);
  });

  test('zero, oversized, and Xavier states survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="parameter-initialization"]');
    const zero = diagram.locator('.distribution-zero');
    const oversized = diagram.locator('.distribution-oversized');
    const xavier = diagram.locator('.distribution-xavier');
    await expect(zero.locator('.strategy-symbol')).toHaveText('0');
    await expect(oversized.locator('.strategy-symbol')).toHaveText('2×');
    await expect(xavier.locator('.strategy-symbol')).toHaveText('X');
    expect(await zero.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'dotted',
    );
    expect(
      await oversized.evaluate((node) => window.getComputedStyle(node).borderTopStyle),
    ).toBe('dashed');
    expect(await xavier.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'double',
    );
    await expectNoOverflowOrClientScripts(page);
  });

  test('the static diagram inherits RTL while keeping numeric evidence left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="parameter-initialization"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));

    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
    const noDraws = diagram
      .locator('.distribution-zero .distribution-statistics dd')
      .first();
    await expect(noDraws).toHaveText('No draws');
    await expect(noDraws).toHaveCSS('direction', 'rtl');
    await expect(diagram.locator('.bin-range .visually-hidden').first()).toHaveCSS(
      'direction',
      'rtl',
    );
    await expect(diagram.locator('.bin-share .visually-hidden').first()).toHaveCSS(
      'direction',
      'rtl',
    );
    await expect(diagram.locator('.visually-hidden[dir="ltr"]')).toHaveCount(0);
    expect(
      await diagram.locator('[dir="ltr"]').evaluateAll((nodes) =>
        nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    const cards = await diagram.locator('[data-initialization-kind]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const rectangle = node.getBoundingClientRect();
        return { right: rectangle.right, top: rectangle.top, bottom: rectangle.bottom };
      }),
    );
    expect(cards).toHaveLength(3);
    expect(Math.abs(cards[0]!.right - cards[1]!.right)).toBeLessThan(1);
    expect(Math.abs(cards[1]!.right - cards[2]!.right)).toBeLessThan(1);
    expect(cards[1]!.top).toBeGreaterThan(cards[0]!.bottom);
    expect(cards[2]!.top).toBeGreaterThan(cards[1]!.bottom);
    await expectNoOverflowOrClientScripts(page);
  });

  test('the complete lesson and Rust-derived trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('[data-initialization-kind]')).toHaveCount(3);
    await expect(page.locator('[data-bin-index]')).toHaveCount(27);
    await expect(page.locator('[data-layer]')).toHaveCount(5);
    await expect(page.locator('[data-reproducibility]')).toHaveCount(2);
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
