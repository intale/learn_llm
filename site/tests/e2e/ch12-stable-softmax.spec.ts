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

const chapterId = '12-stable-softmax';
const contentRevision = 1;
const chapterTitle = 'Turn extreme logits into stable probabilities';
const chapterDescription =
  'Turn vocabulary and attention logits into stable probabilities, log-probabilities, log-sum-exp values, and indexed mean NLL with dependency-free Rust.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`p_i=\frac{\exp(\ell_i-m)}{\sum_j\exp(\ell_j-m)}, \quad m=\max_j\ell_j`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From vocabulary softmax to Transformer probabilities';
const historyLimitation =
  "Bengio et al.'s neural language model turns vocabulary scores into positive next-word probabilities that sum to one with an output softmax. The mathematical normalization is sound, but a literal finite-precision implementation that exponentiates large raw logits first can overflow, while exponentiating very negative raw logits can erase every term through underflow.";
const bengioClaim =
  'Bengio et al. describe an output softmax whose values are positive and sum to one, interpreting its inputs as unnormalized log probabilities for the next word.';
const vaswaniClaim =
  'Vaswani et al. define scaled dot-product attention by applying softmax to scaled query-key products before weighting values, and apply a learned linear transform plus softmax to decoder outputs for predicted next-token probabilities.';
const gpt2Claim =
  "OpenAI's GPT-2 source implements last-axis softmax by subtracting reduce_max with retained dimensions, exponentiating, and dividing by the retained reduce_sum; its attention path applies that helper to scaled masked scores before combining values.";
const modernLlmRole =
  "Stable softmax converts vocabulary or attention logits into normalized weights without changing the represented distribution under a shared constant shift. Log-sum-exp, log-softmax, and fused indexed mean NLL retain training evidence in the log domain when a rounded probability would be too small to represent; this course's arbitrary-axis API, finite-input policy, target layout, allocation rules, and error precedence are local correctness decisions.";
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://github.com/openai/gpt-2/blob/master/src/model.py',
] as const;

const diagramCopy = {
  title: 'See one maximum shift rescue ordinary and extreme logits',
  description:
    'Compare three Rust-recorded rows with equal relative logits, follow their stable normalization and target losses, and inspect four rejected requests.',
  sections: [
    'Subtract one row maximum before exponentiating',
    'Compare raw exponentials with the stable path',
    'Select one log-probability per target',
    'Reject invalid axes, logits, and targets',
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
  ['rust/demos/ch12-stable-softmax/src/lib.rs', 'direct-output-softmax'],
  ['rust/crates/llm-from-scratch/src/nn/probability.rs', 'probability-errors'],
  ['rust/crates/llm-from-scratch/src/nn/probability.rs', 'stable-probability-operations'],
  ['rust/demos/ch12-stable-softmax/src/lib.rs', 'tiny-stable-softmax-example'],
  ['rust/demos/ch12-stable-softmax/src/main.rs', 'learner-stable-softmax-output'],
  ['rust/demos/ch12-stable-softmax/src/diagram_trace.rs', 'stable-softmax-trace'],
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
    order: 12,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict three shifted rows',
    'Normalize with one maximum shift',
    'Name each probability quantity',
    historyHeading,
    'Implement checked log-domain operations',
    'Compare naive and stable exponentials',
    'Predict before running Rust',
    'Prepare an independent gradient oracle',
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
  expect(historyText).toContain(modernLlmRole);
  expect(historyText).not.toMatch(/FORTRAN|Genie|NumPy|programming-language history|array-library history/i);
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

  await expectVisualizationDecision(page, { decision: 'useful', id: 'stable-softmax' });
  const diagram = page.locator('figure[data-visualization-id="stable-softmax"]');
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }

  expect(
    await diagram.locator('[data-softmax-row]').evaluateAll((rows) =>
      rows.map((row) => ({
        row: row.getAttribute('data-softmax-row'),
        maximum: row.getAttribute('data-maximum'),
        shifted: row.getAttribute('data-shifted'),
        probabilities: row.getAttribute('data-probabilities'),
        logProbabilities: row.getAttribute('data-log-probabilities'),
      })),
    ),
  ).toEqual([
    {
      row: '0',
      maximum: '1.000000000000',
      shifted: '-1.000000000000,0.000000000000',
      probabilities: '0.268941421370,0.731058578630',
      logProbabilities: '-1.313261687518,-0.313261687518',
    },
    {
      row: '1',
      maximum: '1001.000000000000',
      shifted: '-1.000000000000,0.000000000000',
      probabilities: '0.268941421370,0.731058578630',
      logProbabilities: '-1.313261687518,-0.313261687518',
    },
    {
      row: '2',
      maximum: '-1000.000000000000',
      shifted: '-1.000000000000,0.000000000000',
      probabilities: '0.268941421370,0.731058578630',
      logProbabilities: '-1.313261687518,-0.313261687518',
    },
  ]);
  expect(
    await diagram.locator('[data-naive-status]').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-naive-status')),
    ),
  ).toEqual(['finite', 'overflow-undefined', 'underflow-undefined']);
  await expect(diagram.locator('.stable-card')).toContainText([
    'Probabilities: [0.268941421370, 0.731058578630]',
    'Probabilities: [0.268941421370, 0.731058578630]',
    'Probabilities: [0.268941421370, 0.731058578630]',
  ]);
  expect(
    await diagram.locator('[data-target-row]').evaluateAll((cards) =>
      cards.map((card) => ({
        row: card.getAttribute('data-target-row'),
        target: card.getAttribute('data-target-class'),
        loss: card.getAttribute('data-target-loss'),
      })),
    ),
  ).toEqual([
    { row: '0', target: '1', loss: '0.313261687518' },
    { row: '1', target: '0', loss: '1.313261687518' },
    { row: '2', target: '1', loss: '0.313261687518' },
  ]);
  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-error-kind')),
    ),
  ).toEqual([
    'axis-out-of-bounds',
    'empty-normalization-axis',
    'positive-infinity-logit',
    'target-out-of-bounds',
  ]);
  await expect(diagram.locator('[data-probabilities-match]')).toHaveAttribute(
    'data-probabilities-match',
    'yes',
  );

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
    for (const selector of ['.comparison-card', '.target-card', '.error-card']) {
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

test.describe('chapter 12 stable-softmax vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 12 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(12);
    expect(englishChapters[11]).toEqual(
      expect.objectContaining({ chapterId, order: 12, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '11-matrix-multiplication'));
    await expectOrderedChapterNavigation(page, 'en', '11-matrix-multiplication', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 12,
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

  test('finite, stable, overflow, underflow, and rejection cues survive forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="stable-softmax"]');
    const finite = diagram.locator('[data-naive-status="finite"]');
    const overflow = diagram.locator('[data-naive-status="overflow-undefined"]');
    const underflow = diagram.locator('[data-naive-status="underflow-undefined"]');
    const stable = diagram.locator('.stable-card').first();
    const rejected = diagram.locator('.error-card').first();
    await expect(finite.locator('.state-symbol')).toHaveText('=');
    await expect(overflow.locator('.state-symbol')).toHaveText('↑');
    await expect(underflow.locator('.state-symbol')).toHaveText('↓');
    await expect(stable.locator('.state-symbol')).toHaveText('S');
    await expect(rejected.locator('.state-symbol')).toHaveText('×');
    expect(await finite.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'solid',
    );
    expect(await overflow.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'dashed',
    );
    expect(await underflow.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'dotted',
    );
    expect(await stable.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'double',
    );
    expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'dashed',
    );
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
    await expect(page.locator('[data-softmax-row]')).toHaveCount(3);
    await expect(page.locator('[data-naive-status]')).toHaveCount(3);
    await expect(page.locator('[data-target-row]')).toHaveCount(3);
    await expect(page.locator('[data-error-kind]')).toHaveCount(4);
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
