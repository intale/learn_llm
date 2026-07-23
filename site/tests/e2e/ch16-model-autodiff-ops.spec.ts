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

const chapterId = '16-model-autodiff-ops';
const contentRevision = 2;
const chapterTitle = 'Reverse the operations that turn token IDs into loss';
const chapterDescription =
  'Build Rust VJPs for matmul, repeated embedding gathers, SiLU, log-softmax, and mean token loss, then verify every gradient numerically.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`\frac{\partial L}{\partial E_{i,:}}=\sum_{(b,t):z_{b,t}=i}\frac{\partial L}{\partial X_{b,t,:}}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From one neural next-word backward pass to reusable decoder VJPs';
const historyLimitation =
  "Bengio et al. train a neural next-word model with a learned word-feature table, matrix transforms, a tanh hidden layer, output probabilities, and explicit model-specific backward/update equations. That presentation makes the full learning path inspectable, but Chapter 15's structural tensor tape still cannot express the lookup, matrix, activation, normalization, and token-loss derivatives needed to train even this small language-model path.";
const historyLater =
  "Abadi et al. describe tensor operation graphs whose differentiation finds every path from a loss to parameters and sums partial-gradient contributions, including gathered embedding rows. Vaswani et al. then repeat learned embeddings, matrix projections, softmax attention, and nonlinear feed-forward transformations throughout the Transformer. Shazeer later evaluates Swish and SwiGLU variants inside Transformer feed-forward sublayers, connecting SiLU's local derivative to a later decoder component.";
const historyModern =
  "This chapter supplies reusable local pullbacks for batched matrix products, repeated row gathers, exp, log, SiLU, stable log-softmax, and fused indexed mean NLL. These operations form the derivative vocabulary later embedding, projection, SwiGLU, attention, and token-loss chapters need. Ordinary inference uses only their forward paths; saved tensors, fusion boundary, finite-value policy, API, trace, and error precedence remain course-local.";
const historyClaims = [
  'Bengio et al. build a neural next-word model from learned word-feature rows, matrix equations, a tanh hidden layer, normalized output probabilities, and an explicit backward/update phase for the model parameters.',
  'Abadi et al. represent operations as graph vertices and tensors as edge values, describe automatic differentiation that sums every backward path to a parameter, and show Gather-based embedding graphs whose gradients update gathered rows.',
  'Vaswani et al. construct the Transformer from learned embeddings, learned query/key/value projections, attention softmax, two-transform ReLU feed-forward sublayers, and a learned output transform followed by softmax.',
  'Shazeer defines Swish as x times sigmoid(beta x), uses Swish with beta one in SwiGLU Transformer feed-forward variants, and reports improved held-out log-perplexity for gated variants over the studied baseline.',
] as const;
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://arxiv.org/pdf/2002.05202',
] as const;

const diagramCopy = {
  title: 'Follow one repeated token from lookup to loss and back',
  description:
    'Inspect five forward operations, signed target gradients, both matrix pullbacks, four occurrence contributions, three embedding rows, exact scalar probes, finite-difference checks, and rejected unsafe requests.',
  sections: [
    'Trace the token path forward',
    'Reverse target selection and the projection',
    'Scatter every occurrence into its shared row',
    'Check each local derivative numerically',
    'Reject invalid selectors and unsafe values',
  ],
  fork:
    'After SiLU, the graph forks: log-softmax displays log-probabilities, while fused mean NLL reads the same SiLU logits together with target classes.',
};

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustRegions = [
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'handwritten-model-backward'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-op-errors'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-saved-context'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-autodiff-operations'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-vjps'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'shared-model-vjp-fixture'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'model-vjp-gradchecks'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'model-op-errors-example'],
  ['rust/demos/ch16-model-autodiff-ops/src/main.rs', 'learner-model-vjp-output'],
  ['rust/demos/ch16-model-autodiff-ops/src/diagram_trace.rs', 'model-autodiff-ops-trace'],
] as const;
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
    order: 16,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict one repeated-token path',
    'Add every occurrence to its shared embedding row',
    'Name the loss, table, selectors, and adjoints',
    historyHeading,
    'Save the evidence each local pullback needs',
    'Follow four occurrence gradients into three parameter rows',
    'Predict before running Rust',
    'Initialize the values these gradients will train',
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
  expect(historyText).toContain('The original Transformer citation uses ReLU');
  expect(historyText).not.toMatch(
    /programming-language history|Rust history|Python history|framework history/i,
  );
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
    id: 'model-autodiff-ops',
  });
  const diagram = page.locator('figure[data-visualization-id="model-autodiff-ops"]');
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(diagram.locator('.forward-fork-note')).toHaveText(diagramCopy.fork);

  expect(
    await diagram.locator('[data-forward-step]').evaluateAll((cards) =>
      cards.map((card) => ({
        step: card.getAttribute('data-forward-step'),
        operation: card.getAttribute('data-operation'),
        sources: card.getAttribute('data-sources'),
        input: card.getAttribute('data-input-shapes'),
        output: card.getAttribute('data-output-shape'),
      })),
    ),
  ).toEqual([
    { step: '0', operation: 'gather_rows', sources: 'embeddings,token_ids', input: '3x2', output: '4x2' },
    { step: '1', operation: 'matmul', sources: 'gather_rows,weights', input: '4x2,2x2', output: '4x2' },
    { step: '2', operation: 'silu', sources: 'matmul', input: '4x2', output: '4x2' },
    { step: '3', operation: 'log_softmax', sources: 'silu', input: '4x2', output: '4x2' },
    { step: '4', operation: 'indexed_mean_nll', sources: 'silu,targets', input: '4x2', output: 'scalar' },
  ]);
  expect(
    await diagram.locator('[data-target-position]').evaluateAll((rows) =>
      rows.map((row) => ({
        position: row.getAttribute('data-target-position'),
        token: row.getAttribute('data-token-id'),
        target: row.getAttribute('data-target-class'),
        gradient: row.getAttribute('data-target-gradient'),
        correct: row.getAttribute('data-correct-sign'),
        competitor: row.getAttribute('data-competitor-sign'),
        sum: row.getAttribute('data-row-sum'),
      })),
    ),
  ).toEqual([
    { position: '0', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '1', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '2', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '3', token: '2', target: '1', gradient: '0.125000000000,-0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
  ]);
  const firstTargetCells = diagram.locator('[data-target-position="0"] td');
  await expect(firstTargetCells.nth(3)).toHaveAccessibleName(/negative.*selected target/i);
  await expect(firstTargetCells.nth(4)).toHaveAccessibleName('positive');
  expect(
    await diagram.locator('[data-occurrence-position]').evaluateAll((cards) =>
      cards.map((card) => ({
        position: card.getAttribute('data-occurrence-position'),
        token: card.getAttribute('data-token-id'),
        destination: card.getAttribute('data-destination-row'),
        contribution: card.getAttribute('data-contribution'),
        repeated: card.getAttribute('data-repeated'),
      })),
    ),
  ).toEqual([
    { position: '0', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '1', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '2', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '3', token: '2', destination: '2', contribution: '0.125000000000,0.125000000000', repeated: 'no' },
  ]);
  expect(
    await diagram.locator('[data-embedding-row]').evaluateAll((cards) =>
      cards.map((card) => ({
        row: card.getAttribute('data-embedding-row'),
        positions: card.getAttribute('data-positions'),
        occurrences: card.getAttribute('data-occurrences'),
        gradient: card.getAttribute('data-gradient'),
      })),
    ),
  ).toEqual([
    { row: '0', positions: 'none', occurrences: '0', gradient: '0.000000000000,0.000000000000' },
    { row: '1', positions: '0,1,2', occurrences: '3', gradient: '-0.375000000000,-0.375000000000' },
    { row: '2', positions: '3', occurrences: '1', gradient: '0.125000000000,0.125000000000' },
  ]);
  await expect(diagram.locator('[data-gradcheck-operation]')).toHaveCount(8);
  await expect(diagram.locator('[data-gradcheck-operation][data-status="pass"]')).toHaveCount(8);
  await expect(diagram.locator('[data-error-kind]')).toHaveCount(4);
  await expect(diagram.locator('[data-error-kind][data-gradients-unchanged="yes"]')).toHaveCount(4);

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scrollers = diagram.locator('.table-scroll');
  await expect(scrollers).toHaveCount(2);
  for (const scroller of await scrollers.all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
  if (narrow) {
    const widths = await scrollers.first().evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const selector of [
      '.forward-card',
      '.pullback-card',
      '.occurrence-card',
      '.embedding-card',
      '.check-card',
      '.error-card',
    ]) {
      const positions = await diagram.locator(selector).evaluateAll((cards) =>
        cards.slice(0, 2).map((card) => {
          const rectangle = card.getBoundingClientRect();
          return { left: rectangle.left, top: rectangle.top, bottom: rectangle.bottom };
        }),
      );
      expect(positions).toHaveLength(2);
      expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
      expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    }
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(9);

  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 16 model-autodiff-ops vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 16 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(16);
    expect(englishChapters[15]).toEqual(
      expect.objectContaining({ chapterId, order: 16, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '15-tensor-autodiff-core'));
    await expectOrderedChapterNavigation(page, 'en', '15-tensor-autodiff-core', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 16,
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

  test('repeated, single, unused, and rejected states survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="model-autodiff-ops"]');
    const repeated = diagram.locator('.occurrence-yes').first();
    const single = diagram.locator('.occurrence-no');
    const unused = diagram.locator('.embedding-unused');
    const rejected = diagram.locator('.state-rejected').first();
    await expect(repeated.locator('.state-symbol')).toHaveText('\u03a3');
    await expect(single.locator('.state-symbol')).toHaveText('\u21a6');
    await expect(unused.locator('.state-symbol')).toHaveText('\u2205');
    await expect(rejected.locator('.state-symbol')).toHaveText('!');
    expect(await repeated.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await single.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    expect(await unused.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
    expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('ridge');
    await expectNoOverflowOrClientScripts(page);
  });

  test('the complete lesson and Rust-derived repeated-token trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('[data-forward-step]')).toHaveCount(5);
    await expect(page.locator('[data-target-position]')).toHaveCount(4);
    await expect(page.locator('[data-pullback-operation]')).toHaveCount(3);
    await expect(page.locator('[data-occurrence-position]')).toHaveCount(4);
    await expect(page.locator('[data-embedding-row]')).toHaveCount(3);
    await expect(page.locator('[data-check-operation]')).toHaveCount(3);
    await expect(page.locator('[data-gradcheck-operation]')).toHaveCount(8);
    await expect(page.locator('[data-error-kind]')).toHaveCount(4);
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
