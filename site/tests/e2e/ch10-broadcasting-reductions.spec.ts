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

const chapterId = '10-broadcasting-reductions';
const contentRevision = 3;
const chapterTitle = 'Broadcast once, reduce a named axis';
const chapterDescription =
  'Broadcast feature-wise values across token states and reduce explicit axes with a dependency-free Rust tensor core.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`y_{\mathbf{i}}=f(a_{\beta_a(\mathbf{i})},b_{\beta_b(\mathbf{i})}), \quad \mu_k=\frac{1}{n_k}\sum_{i_k}x_{\mathbf{i}}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From fixed context to tensor-wide decoder math';
const historyLimitation =
  "Bengio et al. describe n-gram models as conditional-probability tables for a fixed number of preceding words; their feed-forward neural model concatenates learned context-word features into a context vector, applies a hyperbolic-tangent activation element by element, and uses softmax for next-word probabilities. The calculation remains organized around a selected fixed window rather than every position's available causal prefix and the explicit batch, sequence, and head axes used by later decoder Transformers.";
const bengioClaim =
  'Bengio et al. describe n-gram models as conditional-probability tables for a fixed number of preceding words; their feed-forward neural model concatenates learned context-word features into a context vector, applies a hyperbolic-tangent activation element by element, and uses softmax for next-word probabilities.';
const vaswaniClaim =
  'Vaswani et al. define masked decoder self-attention on simultaneous query, key, and value matrices, apply softmax to scaled query-key scores, add residual tensors before layer normalization, and apply the same feed-forward network separately and identically at every position.';
const gpt2Claim =
  'The official GPT-2 implementation labels tensors by batch, sequence, feature, head, destination, and source axes, computes softmax with last-axis reductions that preserve the reduced dimension, and computes normalization with last-axis means followed by learned feature-sized scale and bias vectors.';
const modernLlmRole =
  "Broadcasting and explicit axis reductions let this course apply scalar or feature-sized operations across decoder tensors and compute the per-axis statistics needed by attention softmax and feature normalization. Trailing-axis compatibility, checked shape errors, empty-axis behavior, keep-dimension options, and allocation policy are course-local; the model sources specify computations, while the NumPy guide supplies only supporting array-rule provenance.";
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf',
  'https://github.com/openai/gpt-2/blob/master/src/model.py',
] as const;

const diagramCopy = {
  title: 'Reuse one feature vector, then name each collapsed axis',
  description:
    'Align one three-feature bias with two token rows, follow all six Rust-recorded coordinate mappings, and compare sum, mean, max, and rejected requests.',
  sections: [
    'Align missing leading axes from the right',
    'Map every result coordinate to both inputs',
    'Collapse one named axis at a time',
    'Reject shapes and reductions without a value',
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
  ['rust/demos/ch10-broadcasting-reductions/src/lib.rs', 'tiny-token-feature-example'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'broadcast-planning'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'elementwise-maps'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'axis-reductions'],
  ['rust/demos/ch10-broadcasting-reductions/src/main.rs', 'learner-broadcasting-output'],
  [
    'rust/demos/ch10-broadcasting-reductions/src/diagram_trace.rs',
    'broadcasting-reductions-trace',
  ],
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
    order: 10,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict one feature offset across two token rows',
    'Map broadcast coordinates and reduce one axis',
    'Account for every coordinate, extent, and mapping',
    historyHeading,
    'Plan shapes before evaluating values',
    'See reused features and collapsed axes',
    'Predict valid shapes and reduction results',
    'Prepare the primitives behind normalization and softmax',
  ]);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${historyHeading}"]]`,
    );
  const historyText = await readMathAwareText(historyNodes);
  expect(historyText).toContain(historyLimitation);
  expect(historyText).toContain(bengioClaim);
  expect(historyText).toContain(`${vaswaniClaim} ${gpt2Claim}`);
  expect(historyText).toContain(vaswaniClaim);
  expect(historyText).toContain(gpt2Claim);
  expect(historyText).toContain(modernLlmRole);
  expect(historyText).not.toMatch(/FORTRAN|Genie|Iliffe|from loops to|programming-language history/i);
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  const formula = page
    .locator('.katex-display')
    .filter({ has: page.locator('annotation[encoding="application/x-tex"]', { hasText: formulaLatex }) });
  await expect(formula).toHaveCount(1);
  await expect(formula).toHaveCSS('direction', 'ltr');
  await expect(formula.locator('annotation[encoding="application/x-tex"]')).toHaveText(formulaLatex);

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
    id: 'broadcasting-reductions',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="broadcasting-reductions"]',
  );
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(diagram.locator('[data-alignment-id]')).toHaveCount(3);
  await expect(diagram.locator('[data-alignment-id="tokens"]')).toContainText('[2, 3]');
  await expect(diagram.locator('[data-alignment-id="bias"]')).toContainText('[1, 3]');
  await expect(diagram.locator('[data-alignment-id="output"]')).toContainText('[2, 3]');

  const maps = diagram.locator('[data-output-coordinate]');
  await expect(maps).toHaveCount(6);
  expect(
    await maps.evaluateAll((rows) =>
      rows.map((row) => ({
        output: row.getAttribute('data-output-coordinate'),
        left: row.getAttribute('data-left-coordinate'),
        right: row.getAttribute('data-right-coordinate'),
        value: row.getAttribute('data-result-value'),
      })),
    ),
  ).toEqual([
    { output: '0,0', left: '0,0', right: '0', value: '11.0' },
    { output: '0,1', left: '0,1', right: '1', value: '22.0' },
    { output: '0,2', left: '0,2', right: '2', value: '33.0' },
    { output: '1,0', left: '1,0', right: '0', value: '14.0' },
    { output: '1,1', left: '1,1', right: '1', value: '25.0' },
    { output: '1,2', left: '1,2', right: '2', value: '36.0' },
  ]);

  const reductions = diagram.locator('[data-reduction-operation]');
  await expect(reductions).toHaveCount(3);
  expect(
    await reductions.evaluateAll((cards) =>
      cards.map((card) => ({
        operation: card.getAttribute('data-reduction-operation'),
        axis: card.getAttribute('data-reduction-axis'),
        keepDim: card.getAttribute('data-keep-dim'),
        shape: card.getAttribute('data-output-shape'),
        groups: Array.from(card.querySelectorAll('[data-group-indices]')).map((group) =>
          group.getAttribute('data-group-indices'),
        ),
      })),
    ),
  ).toEqual([
    { operation: 'sum', axis: '0', keepDim: 'no', shape: '3', groups: ['0,3', '1,4', '2,5'] },
    { operation: 'mean', axis: '1', keepDim: 'yes', shape: '2,1', groups: ['0,1,2', '3,4,5'] },
    { operation: 'max', axis: '1', keepDim: 'no', shape: '2', groups: ['0,1,2', '3,4,5'] },
  ]);
  await expect(reductions.nth(0)).toContainText('[25.0, 47.0, 69.0]');
  await expect(reductions.nth(1)).toContainText('[22.0, 25.0]');
  await expect(reductions.nth(2)).toContainText('[33.0, 36.0]');

  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-error-kind')),
    ),
  ).toEqual(['incompatible-broadcast', 'empty-mean-axis', 'empty-max-axis']);
  await expect(
    diagram.locator(
      '[data-error-kind="incompatible-broadcast"] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText(String.raw`3\ne2`);
  await expect(diagram.locator('[data-error-kind="empty-mean-axis"]')).toContainText('mean');
  await expect(diagram.locator('[data-error-kind="empty-max-axis"]')).toContainText('max');

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scroller = diagram.locator('.mapping-scroll');
  await scroller.focus();
  await expect(scroller).toBeFocused();
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(7);

  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 10 broadcasting-reductions vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 10 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(10);
    expect(englishChapters[9]).toEqual(
      expect.objectContaining({ chapterId, order: 10, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '09-tensor-views'));
    await expectOrderedChapterNavigation(page, 'en', '09-tensor-views', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 10,
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

  test('reuse, reduction, and rejection remain distinct in forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator(
      'figure[data-visualization-id="broadcasting-reductions"]',
    );
    const reused = diagram.locator('.reused-value').first();
    const reduced = diagram.locator('.reduction-card').first();
    const rejected = diagram.locator('.error-card').first();
    await expect(reused.locator('.state-symbol')).toHaveText('↻');
    await expect(reduced.locator('.state-symbol')).toHaveText('↓');
    await expect(rejected.locator('.state-symbol')).toHaveText('×');
    expect(await reused.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'solid',
    );
    expect(await reduced.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'double',
    );
    expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'dashed',
    );
    await expectNoOverflowOrClientScripts(page);
  });
});
