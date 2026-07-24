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

const chapterId = '21-mini-batches';
const chapterTitle = 'Count only the tokens that are really in the batch';
const chapterDescription =
  'Shuffle complete causal windows into fixed-shape mini-batches, keep the smaller final batch, and average loss and gradients over its actual target tokens.';
const chapterHeadings = [
  'Predict the smaller final batch',
  'Divide by actual target tokens',
  'Keep batch and sequence axes distinct',
  'From one word update to token-sized LLM batches',
  'Shuffle windows, then merge raw sums',
  'Trace every shuffled window and denominator',
  'Predict before checking the exact epoch',
  'Hand token-mean gradients to AdamW',
] as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, '');

async function expectFormulaGeometry(page: Page) {
  const problems = await page
    .locator('.lesson-body .katex-display, .lesson-body [data-inline-math]')
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();
        const source =
          element.querySelector('annotation[encoding="application/x-tex"]')?.textContent ??
          `formula ${index}`;
        const issues: string[] = [];
        let ancestor: HTMLElement | null = element.parentElement;
        let localScroller = false;
        while (ancestor && ancestor !== document.body) {
          const { overflowX } = getComputedStyle(ancestor);
          if (
            ['auto', 'scroll'].includes(overflowX) &&
            ancestor.scrollWidth > ancestor.clientWidth + 1
          ) {
            localScroller = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        if (
          (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) &&
          !localScroller
        ) {
          issues.push(`${source} escapes the viewport`);
        }
        if (rect.width <= 0 || rect.height <= 0) issues.push(`${source} has no visible box`);
        const style = getComputedStyle(element);
        if (style.direction !== 'ltr') issues.push(`${source} is not left-to-right`);
        if (
          ['auto', 'clip', 'hidden', 'scroll'].includes(style.overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) {
          issues.push(`${source} clips vertically`);
        }
        if (element.classList.contains('katex-display')) {
          const container = element.parentElement;
          const next = container?.nextElementSibling as HTMLElement | null;
          if (
            container &&
            next &&
            container.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1
          ) {
            issues.push(`${source} overlaps the following block`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 21,
    revision: 1,
    revisionLabel: 'Content revision',
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);
  await expect(page.locator('.lesson-body h2')).toHaveText(chapterHeadings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [
    String.raw`\mathcal{L}_B=\frac{1}{|B|T}\sum_{b\in B}\sum_{t=1}^{T}\mathcal{L}_{b,t}`,
    String.raw`\nabla_{\theta}\mathcal{L}_B`,
    String.raw`\mathcal{L}_{B_1}=\frac{1.75}{2\cdot2}=0.4375`,
    String.raw`|B|_{\max}=3`,
    String.raw`\bar g_{B_1}=[0.875000, 1.562500]`,
  ]) {
    expect(
      annotations.map(normalizeMath).some((formula) => formula.includes(normalizeMath(expected))),
      `expected a rendered formula containing ${expected}`,
    ).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  const code = await page.locator('.lesson-body :not(pre) > code').allTextContents();
  for (const expression of ['|B|T', '3*2', '2*2', '1.75/4', '4/6']) {
    expect(code).not.toContain(expression);
  }
  await expectFormulaGeometry(page);

  const history = page
    .getByRole('heading', {
      level: 2,
      name: 'From one word update to token-sized LLM batches',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From one word update to token-sized LLM batches"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain(
    'road from stochastic neural-language-model examples to modern LLM token batches',
  );
  expect(historyText).toContain('token volume an explicit unit of work');
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(3);

  await expect(page.locator('figure.rust-source')).toHaveCount(8);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'mini-batches' });
  const diagram = page.locator('figure[data-visualization-id="mini-batches"]');
  await expect(diagram).toHaveAccessibleName(
    'Follow five complete windows into two token-normalized batches',
  );
  await expect(diagram).toHaveAccessibleDescription(
    'Read exact Rust-authored shuffle order, row-major input and target IDs, per-token losses, actual denominators, mean gradients, and coverage proofs for the frozen epoch.',
  );
  await expect(diagram.locator('.shuffle-list li')).toHaveCount(5);
  await expect(diagram.locator('.shuffle-list strong')).toHaveText([
    'train-b@1',
    'train-a@1',
    'train-b@0',
    'train-a@0',
    'train-a@2',
  ]);
  await expect(diagram.locator('.batch-card')).toHaveCount(2);
  await expect(diagram.locator('.batch-card[data-batch="0"] .window-row')).toHaveCount(3);
  await expect(diagram.locator('.batch-card[data-batch="1"] .window-row')).toHaveCount(2);
  await expect(diagram.locator('.batch-card[data-batch="0"]')).toContainText('6.125000');
  await expect(diagram.locator('.batch-card[data-batch="0"]')).toContainText('1.020833');
  await expect(diagram.locator('.batch-card[data-batch="1"]')).toContainText('1.750000');
  await expect(diagram.locator('.batch-card[data-batch="1"]')).toContainText('0.437500');
  await expect(diagram.locator('.unused-slot')).toHaveCount(1);
  await expect(diagram.locator('.unused-slot')).toContainText('Unused — contributes nothing');
  await expect(diagram.locator('.proof-grid dd')).toHaveText([
    '5/5',
    '0',
    '0',
    '0',
    'Same',
    'Changed',
    'Equal',
  ]);

  const scrollers = diagram.locator('.batch-scroll');
  await expect(scrollers).toHaveCount(2);
  await expect(scrollers.first()).toHaveAttribute('role', 'region');
  await expect(scrollers.first()).toHaveAccessibleName(
    'Scrollable mini-batch token evidence for batch 0',
  );
  await scrollers.first().focus();
  await expect(scrollers.first()).toBeFocused();

  const containment = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(node.querySelectorAll<HTMLElement>('.batch-card, .window-row')).map(
      (card) => ({ clientHeight: card.clientHeight, scrollHeight: card.scrollHeight }),
    ),
  }));
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth);
  for (const card of containment.cards) {
    expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight + 2);
  }
  if (narrow) {
    const batchTops = await diagram
      .locator('.batch-card')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    expect(batchTops[1]).toBeGreaterThan(batchTops[0]);
    const contrastTops = await diagram
      .locator('.denominator-contrast article')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    expect(contrastTops[1]).toBeGreaterThan(contrastTops[0]);
    const width = await scrollers.first().evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(width.scroll).toBeGreaterThan(width.client);
  }

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(8);
  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 21 mini-batches vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 21 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(21);
    expect(english[20]).toEqual(
      expect.objectContaining({ chapterId, order: 21, title: chapterTitle }),
    );
    const russian = await readOrderedCourseChapters(page, 'ru');
    expect(russian).toHaveLength(7);
    expect(russian.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', chapterId));
    await expect(page.locator('.locale-switch a[data-locale="ru"]')).toHaveAttribute(
      'href',
      '/ru/course/',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveCount(0);
    const missing = await page.goto(chapterPath('ru', chapterId));
    expect(missing?.status()).toBe(404);
  });

  test('the complete Rust-backed lesson renders at desktop and narrow widths', async ({ page }) => {
    const chapters = await readOrderedCourseChapters(page, 'en');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(chapterPath('en', chapterId));
    await expectChapterContent(page, chapters, false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectChapterContent(page, chapters, true);
  });

  test('full, final, and unused structures remain distinct in forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="mini-batches"]');
    await expect(diagram.locator('.batch-card').first()).toHaveCSS('border-top-style', 'solid');
    await expect(diagram.locator('.batch-card.final-card')).toHaveCSS(
      'border-top-style',
      'double',
    );
    await expect(diagram.locator('.unused-slot')).toHaveCSS('border-top-style', 'dashed');
    await expectNoOverflowOrClientScripts(page);
  });

  test('localized labels inherit RTL while trace evidence and formulas remain left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="mini-batches"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
    expect(
      await diagram.locator('bdi[dir="ltr"]').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    expect(
      await diagram.locator('[data-inline-math]').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    await expectNoOverflowOrClientScripts(page);
  });

  test('the lesson and exact trace render without JavaScript', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('.shuffle-list li')).toHaveCount(5);
    await expect(page.locator('.batch-card')).toHaveCount(2);
    await expect(page.locator('.unused-slot')).toContainText('Unused — contributes nothing');
    await expect(page.locator('.proof-grid')).toContainText('5/5');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
