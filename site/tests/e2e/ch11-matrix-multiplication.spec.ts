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

const chapterId = '11-matrix-multiplication';
const contentRevision = 1;
const chapterTitle = 'Multiply rows by columns, then reuse batches';
const chapterDescription =
  'Multiply checked 2-D and batched tensors with scalar Rust loops, including inner-dimension checks, batch broadcasting, and transpose flags.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`C_{ij}=\sum_{k=0}^{K-1} A_{ik}B_{kj}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From one fixed context vector to matrices of positions';
const historyLimitation =
  "Bengio et al.'s feed-forward neural language model looks up n - 1 learned word vectors, concatenates them into one context vector x, and computes next-word scores with learned matrix-vector transforms. It shares features beyond count tables, but each prediction is still organized around one finite context vector rather than masked attention over a matrix of positions.";
const bengioClaim =
  'Bengio et al. represent learned word features with a |V| by m matrix C, concatenate the n - 1 context-word vectors into x, and compute next-word scores with y = b + Wx + U tanh(d + Hx).';
const vaswaniClaim =
  'Vaswani et al. pack queries, keys, and values into matrices, define attention as softmax(QK^T / sqrt(d_k))V, and use learned Q, K, V, and output projections plus two linear transforms in each position-wise feed-forward network.';
const gpt2Claim =
  'The GPT-2 report uses a Transformer-based architecture for autoregressive language models and scales its four model sizes from 12 to 48 layers, model widths 768 to 1600, and a 1024-token context.';
const modernLlmRole =
  "Checked matrix multiplication is the reusable contraction behind learned projections, attention scores, and attention-weighted values on the road to a modern decoder. This course's batched broadcasting, transpose flags, strided traversal, storage policy, zero-size rules, and explicit errors are local correctness decisions, not designs attributed to the papers.";
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
] as const;

const diagramCopy = {
  title: 'Follow one row-by-column contraction, then reuse one weight batch',
  description:
    'Compare the three Rust-recorded matrices, accumulate C at row 1 column 0 in k order, and inspect transpose, batch reuse, and rejected shapes.',
  sections: [
    'Select one left row and one right column',
    'Accumulate three products in contracted-index order',
    'Reuse logical weights without copying values',
    'Reject mismatched inner and batch dimensions',
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
  ['rust/demos/ch11-matrix-multiplication/src/lib.rs', 'fixed-width-projection'],
  ['rust/crates/llm-from-scratch/src/tensor/matmul.rs', 'matmul-errors'],
  ['rust/crates/llm-from-scratch/src/tensor/matmul.rs', 'checked-matmul'],
  ['rust/demos/ch11-matrix-multiplication/src/lib.rs', 'tiny-matmul-example'],
  ['rust/demos/ch11-matrix-multiplication/src/main.rs', 'learner-matrix-multiplication-output'],
  [
    'rust/demos/ch11-matrix-multiplication/src/diagram_trace.rs',
    'matrix-multiplication-trace',
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
    order: 11,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict one row-by-column product',
    'Contract one shared inner dimension',
    'Name every matrix index and extent',
    historyHeading,
    'Check shapes before the scalar loops',
    'Trace one output cell, then add a batch axis',
    'Predict products before running Rust',
    'Prepare learned projections and attention',
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
  expect(historyText).not.toMatch(/FORTRAN|Genie|Iliffe|from loops to|programming-language history/i);
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

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'matrix-multiplication',
  });
  const diagram = page.locator('figure[data-visualization-id="matrix-multiplication"]');
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(diagram.locator('table[data-matrix-id]')).toHaveCount(3);
  await expect(diagram.locator('table[data-matrix-id="left"]')).toContainText('1.0');
  await expect(diagram.locator('table[data-matrix-id="right"]')).toContainText('2.0');
  await expect(diagram.locator('table[data-matrix-id="output"]')).toContainText('16.0');

  const terms = diagram.locator('[data-contracted-index]');
  await expect(terms).toHaveCount(3);
  expect(
    await terms.evaluateAll((cards) =>
      cards.map((card) => ({
        output: card.getAttribute('data-output-coordinate'),
        inner: card.getAttribute('data-contracted-index'),
        left: card.getAttribute('data-left-coordinate'),
        right: card.getAttribute('data-right-coordinate'),
        product: card.getAttribute('data-product'),
        total: card.getAttribute('data-running-total'),
      })),
    ),
  ).toEqual([
    { output: '1,0', inner: '0', left: '1,0', right: '0,0', product: '4.0', total: '4.0' },
    { output: '1,0', inner: '1', left: '1,1', right: '1,0', product: '0.0', total: '4.0' },
    { output: '1,0', inner: '2', left: '1,2', right: '2,0', product: '12.0', total: '16.0' },
  ]);

  const transpose = diagram.locator('[data-transpose-operand="right"]');
  await expect(transpose).toContainText('[2, 3]');
  await expect(transpose).toContainText('[3, 2]');
  await expect(transpose).toContainText('[7.0, 4.0, 16.0, 13.0]');
  expect(
    await diagram.locator('[data-output-batch]').evaluateAll((cards) =>
      cards.map((card) => ({
        output: card.getAttribute('data-output-batch'),
        left: card.getAttribute('data-left-batch'),
        right: card.getAttribute('data-right-batch'),
      })),
    ),
  ).toEqual([
    { output: '0', left: '0', right: '0' },
    { output: '1', left: '1', right: '0' },
  ]);
  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-error-kind')),
    ),
  ).toEqual(['inner-dimension-mismatch', 'incompatible-batch']);
  await expect(diagram.locator('[data-error-kind="incompatible-batch"]')).toContainText(
    'Batch axis 0: 2 ≠ 3',
  );

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scroller = diagram.locator('.matrix-scroll');
  await scroller.focus();
  await expect(scroller).toBeFocused();
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const selector of ['.term-card', '.batch-card', '.error-card']) {
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

test.describe('chapter 11 matrix-multiplication vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 11 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(11);
    expect(englishChapters[10]).toEqual(
      expect.objectContaining({ chapterId, order: 11, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '10-broadcasting-reductions'));
    await expectOrderedChapterNavigation(page, 'en', '10-broadcasting-reductions', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 11,
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

  test('row, column, contraction, reuse, and rejection survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="matrix-multiplication"]');
    const selectedRow = diagram.locator('.selected-row');
    const selectedColumn = diagram.locator('.selected-column').first();
    const contracted = diagram.locator('.term-card').first();
    const reused = diagram.locator('.batch-card').first();
    const rejected = diagram.locator('.error-card').first();
    await expect(selectedRow.locator('.state-symbol')).toHaveText('R');
    await expect(selectedColumn.locator('.state-symbol')).toHaveText('C');
    await expect(contracted.locator('.state-symbol')).toHaveText('Σ');
    await expect(reused.locator('.state-symbol')).toHaveText('↻');
    await expect(rejected.locator('.state-symbol')).toHaveText('×');
    expect(await selectedRow.evaluate((node) => window.getComputedStyle(node).borderLeftStyle)).toBe(
      'solid',
    );
    expect(
      await selectedColumn.evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
    ).toBe('dotted');
    expect(await contracted.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'double',
    );
    expect(await reused.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
      'solid',
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
    await expect(page.locator('[data-contracted-index]')).toHaveCount(3);
    await expect(page.locator('[data-output-batch]')).toHaveCount(2);
    await expect(page.locator('[data-error-kind]')).toHaveCount(2);
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
