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

const chapterId = '13-gradient-checking';
const contentRevision = 1;
const chapterTitle = 'Check gradients before trusting backpropagation';
const chapterDescription =
  'Check derivatives used in LLM training with central differences, scale-aware error, and deterministic tensor-coordinate sampling in dependency-free Rust.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`f'(\theta)\approx\frac{f(\theta+h)-f(\theta-h)}{2h}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From next-word backpropagation to checked Transformer training';
const historyLimitation =
  "Bengio et al.'s neural language model maximizes next-word log-likelihood with an explicit backward/update phase over output, hidden, and learned word-feature parameters. Those propagated derivatives make repeated training updates practical, but the implemented derivative path is not an independent check of itself.";
const historyLater =
  "The Transformer carries gradient-based training into repeated attention and feed-forward layers, using Adam for 100,000 base-model or 300,000 big-model steps. Baydin et al. distinguish finite-difference probes from reverse-mode automatic differentiation: central differences expose local derivative mistakes, while reverse mode efficiently produces a scalar objective's gradient over many parameters.";
const historyModern =
  'This chapter uses central differences only as a slow sampled oracle for analytic candidates, including the Chapter 12 indexed mean NLL derivative, before Chapter 14 builds reverse mode. It does not train or run the decoder; its step size, tolerance, coordinate selection, restoration, finite-input, storage, and error-order rules are course-local.';
const historyClaims = [
  'Bengio et al. maximize next-word log-likelihood and publish a backward/update phase that propagates gradients through output units, hidden weights, and learned word-feature vectors.',
  'Vaswani et al. train Transformer base models for 100,000 steps and big models for 300,000 steps, using Adam with an explicit learning-rate schedule.',
  "Baydin et al. describe centered finite differences, the truncation-versus-round-off step-size trade-off, poor scaling for full numerical gradients, and reverse mode's efficiency for a scalar objective with many parameters.",
] as const;
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://arxiv.org/abs/1502.05767',
] as const;

const diagramCopy = {
  title: 'See a centered slope converge, then deteriorate',
  description:
    'Separate the quadratic sanity check from a six-step cubic scan, then inspect two candidate verdicts, four sampled token-loss coordinates, exact restoration, and four rejected requests.',
  sections: [
    'Check the quadratic at theta equals three',
    'Scan six step sizes around theta equals one point five',
    'Distinguish a wrong gradient from an invalid request',
    'Probe four coordinates of the token loss',
    'Reject unsafe numerical requests',
  ],
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
  ['rust/demos/ch13-gradient-checking/src/lib.rs', 'quadratic-gradient-prediction'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'central-difference'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'scale-aware-comparison'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'gradcheck-errors'],
  ['rust/crates/llm-from-scratch/src/autograd/gradcheck.rs', 'sampled-tensor-gradient-check'],
  ['rust/demos/ch13-gradient-checking/src/lib.rs', 'hand-derived-nll-gradient'],
  ['rust/demos/ch13-gradient-checking/src/lib.rs', 'sampled-nll-gradient-check'],
  ['rust/demos/ch13-gradient-checking/src/main.rs', 'learner-gradient-check-output'],
  ['rust/demos/ch13-gradient-checking/src/diagram_trace.rs', 'gradient-checking-trace'],
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
    order: 13,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict one quadratic derivative',
    'Center two probes around one point',
    'Name the derivative-check quantities',
    historyHeading,
    'Implement a sampled numerical oracle',
    'Watch the step size help, then hurt',
    'Predict before running Rust',
    'Prepare reverse-mode differentiation',
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
  expect(historyText).toContain('Neither model paper claims to use this checker.');
  expect(historyText).not.toMatch(/programming-language history|Rust history|Python history|array-library history/i);
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

  await expectVisualizationDecision(page, { decision: 'useful', id: 'gradient-checking' });
  const diagram = page.locator('figure[data-visualization-id="gradient-checking"]');
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }

  expect(
    await diagram.locator('[data-step-index]').evaluateAll((rows) =>
      rows
        .filter((row) => row.matches('tr'))
        .map((row) => ({
          index: row.getAttribute('data-step-index'),
          phase: row.getAttribute('data-phase'),
          status: row.getAttribute('data-status'),
          step: row.getAttribute('data-step'),
          numerical: row.getAttribute('data-numerical'),
          error: row.getAttribute('data-scaled-error'),
        })),
    ),
  ).toEqual([
    { index: '0', phase: 'truncation', status: 'fail', step: '1.000000000000e0', numerical: '5.750000000000', error: '1.739130434783e-1' },
    { index: '1', phase: 'truncation', status: 'fail', step: '1.000000000000e-1', numerical: '4.760000000000', error: '2.100840336136e-3' },
    { index: '2', phase: 'converging', status: 'pass', step: '1.000000000000e-3', numerical: '4.750001000000', error: '2.105262021379e-7' },
    { index: '3', phase: 'trusted', status: 'pass', step: '1.000000000000e-5', numerical: '4.750000000131', error: '2.758704376049e-11' },
    { index: '4', phase: 'rounding', status: 'pass', step: '1.000000000000e-8', numerical: '4.749999971132', error: '6.077470970922e-9' },
    { index: '5', phase: 'rounding', status: 'fail', step: '1.000000000000e-12', numerical: '4.750422277766', error: '8.889267973000e-5' },
  ]);
  expect(
    await diagram.locator('[data-comparison-name]').evaluateAll((cards) =>
      cards.map((card) => ({
        name: card.getAttribute('data-comparison-name'),
        status: card.getAttribute('data-status'),
      })),
    ),
  ).toEqual([
    { name: 'quadratic-correct', status: 'pass' },
    { name: 'quadratic-wrong', status: 'fail' },
  ]);
  expect(
    await diagram.locator('[data-sample-flat]').evaluateAll((cards) =>
      cards.map((card) => ({
        flat: card.getAttribute('data-sample-flat'),
        coordinate: card.getAttribute('data-coordinate'),
        status: card.getAttribute('data-status'),
      })),
    ),
  ).toEqual([
    { flat: '0', coordinate: '0:0', status: 'pass' },
    { flat: '1', coordinate: '0:1', status: 'pass' },
    { flat: '3', coordinate: '1:0', status: 'pass' },
    { flat: '5', coordinate: '1:2', status: 'pass' },
  ]);
  await expect(diagram.locator('[data-restored-exactly]')).toHaveAttribute(
    'data-restored-exactly',
    'yes',
  );
  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-error-kind')),
    ),
  ).toEqual([
    'invalid-step',
    'collapsed-perturbation',
    'non-finite-evaluation',
    'shape-mismatch',
  ]);

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scroller = diagram.locator('.trace-scroll');
  await scroller.focus();
  await expect(scroller).toBeFocused();
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const selector of ['.candidate-card', '.coordinate-card', '.error-card']) {
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
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 13 gradient-checking vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 13 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(13);
    expect(englishChapters[12]).toEqual(
      expect.objectContaining({ chapterId, order: 13, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '12-stable-softmax'));
    await expectOrderedChapterNavigation(page, 'en', '12-stable-softmax', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 13,
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

  test('phase, verdict, and rejection cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="gradient-checking"]');
    const truncation = diagram.locator('.phase-chip.phase-truncation').first();
    const converging = diagram.locator('.phase-chip.phase-converging').first();
    const trusted = diagram.locator('.phase-chip.phase-trusted').first();
    const rounding = diagram.locator('.phase-chip.phase-rounding').first();
    const passed = diagram.locator('[data-comparison-name="quadratic-correct"]');
    const failed = diagram.locator('[data-comparison-name="quadratic-wrong"]');
    const rejected = diagram.locator('.error-card').first();
    await expect(truncation).toContainText('T');
    await expect(converging).toContainText('C');
    await expect(trusted).toContainText('S');
    await expect(rounding).toContainText('R');
    await expect(passed.locator('.state-symbol')).toHaveText('OK');
    await expect(failed.locator('.state-symbol')).toHaveText('!');
    await expect(rejected.locator('.state-symbol')).toHaveText('X');
    expect(await truncation.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('solid');
    expect(await converging.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    expect(await trusted.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await rounding.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
    expect(await passed.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await failed.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    await expectNoOverflowOrClientScripts(page);
  });

  test('the full lesson and Rust-derived figure render with JavaScript disabled', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('tr[data-step-index]')).toHaveCount(6);
    await expect(page.locator('[data-comparison-name]')).toHaveCount(2);
    await expect(page.locator('[data-sample-flat]')).toHaveCount(4);
    await expect(page.locator('[data-error-kind]')).toHaveCount(4);
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
