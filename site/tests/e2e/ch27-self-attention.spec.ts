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

const chapterId = '27-self-attention';
const chapterTitle = 'Compute one unmasked self-attention head';
const chapterDescription =
  'Learn how one unmasked Transformer self-attention head scores queries against keys, normalizes each row, and mixes values with inspectable Rust evidence.';
const diagramTitle = 'Follow every score into a weighted value mixture';
const diagramDescription =
  'Read the exact Rust-authored query, key, value, score, probability, mixture, gradient, shape, history, and rejected-boundary evidence without recomputing attention in the page.';
const chapterHeadings = [
  'Predict which value each query will retrieve',
  'Score, scale, normalize, and mix',
  'Keep query rows and key columns separate',
  'From recurrent context to all-position retrieval',
  'Compose the head from differentiable tensor operations',
  'Inspect every attention row without browser-side arithmetic',
  'Predict before reading the evidence',
  'Mask future keys next',
] as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, '');

async function expectFormulaGeometry(page: Page) {
  const problems = await page
    .locator('.lesson-body .katex-display, .lesson-body [data-inline-math] > .katex')
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
          const renderedBoxes = Array.from(
            element.querySelectorAll<HTMLElement>('.katex-html *'),
          )
            .map((rendered) => rendered.getBoundingClientRect())
            .filter((rendered) => rendered.width > 0 && rendered.height > 0);
          if (renderedBoxes.length === 0) {
            issues.push(`${source} has no rendered HTML boxes`);
          } else {
            const renderedTop = Math.min(...renderedBoxes.map((rendered) => rendered.top));
            const renderedBottom = Math.max(...renderedBoxes.map((rendered) => rendered.bottom));
            if (renderedTop < rect.top - 1) issues.push(`${source} clips its upper rendered limit`);
            if (renderedBottom > rect.bottom + 1) {
              issues.push(`${source} clips its lower rendered limit`);
            }
          }
          const container = element.parentElement;
          const next = container?.nextElementSibling as HTMLElement | null;
          if (
            container &&
            next &&
            container.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1
          ) {
            issues.push(`${source} overlaps the following block`);
          }
        } else {
          const owner = element.closest<HTMLElement>(
            '.input-card, .score-card, .probability-card, .mixture-card, .evidence-card, .history-card, td, th, p, li',
          );
          if (
            owner &&
            !element.closest(
              '.inputs-scroller, .scores-scroller, .probabilities-scroller, .mixtures-scroller, .gradients-scroller, .history-scroller, .formula-scroller',
            )
          ) {
            const ownerRect = owner.getBoundingClientRect();
            if (rect.top < ownerRect.top - 1 || rect.bottom > ownerRect.bottom + 1) {
              issues.push(`${source} escapes its owner vertically`);
            }
            if (rect.left < ownerRect.left - 1 || rect.right > ownerRect.right + 1) {
              issues.push(`${source} crosses its owner border`);
            }
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectDiagramContainment(page: Page, narrow: boolean) {
  const diagram = page.locator('figure[data-visualization-id="self-attention"]');
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(
      node.querySelectorAll<HTMLElement>(
        '.input-card, .score-card, .probability-card, .mixture-card, .evidence-card, .history-card',
      ),
    ).map((card) => ({
      label:
        card.getAttribute('data-input-role') ??
        card.getAttribute('data-score-kind') ??
        card.getAttribute('data-probability-row') ??
        card.getAttribute('data-mixture-row') ??
        card.getAttribute('data-evidence-kind') ??
        card.getAttribute('data-history-kind') ??
        card.className,
      clientHeight: card.clientHeight,
      scrollHeight: card.scrollHeight,
      clientWidth: card.clientWidth,
      scrollWidth: card.scrollWidth,
    })),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
  for (const card of result.cards) {
    expect(card.scrollHeight, `${card.label} card vertical containment`).toBeLessThanOrEqual(
      card.clientHeight + 2,
    );
    expect(card.scrollWidth, `${card.label} card horizontal containment`).toBeLessThanOrEqual(
      card.clientWidth + 2,
    );
  }

  const scrollers = diagram.locator(
    '.inputs-scroller, .scores-scroller, .probabilities-scroller, .mixtures-scroller, .gradients-scroller, .history-scroller',
  );
  await expect(scrollers).toHaveCount(6);
  const scrollerProblems = await scrollers.evaluateAll((nodes) =>
    nodes.flatMap((node, index) => {
      const scroller = node as HTMLElement;
      const style = getComputedStyle(scroller);
      const issues: string[] = [];
      if (!['auto', 'scroll'].includes(style.overflowX)) {
        issues.push(`scroller ${index} does not own horizontal overflow`);
      }
      if (scroller.getAttribute('role') !== 'region' || !scroller.getAttribute('aria-label')) {
        issues.push(`scroller ${index} is not a named region`);
      }
      if (scroller.scrollHeight > scroller.clientHeight + 2) {
        issues.push(`scroller ${index} clips vertically`);
      }
      return issues;
    }),
  );
  expect(scrollerProblems).toEqual([]);

  for (const scroller of await scrollers.all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }

  if (narrow) {
    for (const scroller of await scrollers.all()) {
      const width = await scroller.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(width.scroll).toBeGreaterThan(width.client);
    }
  }
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 27,
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
    String.raw`A=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right),\quad O=AV`,
    String.raw`QK^\top=\begin{bmatrix}0&6\\6&-4\end{bmatrix}`,
    String.raw`\sum_j A_{ij}=1`,
    String.raw`A\in\mathbb{R}^{B\times T\times T}`,
    String.raw`\bar Q\approx[0.079000,-0.039500,-0.014389,0.007195]`,
    String.raw`A_{0,:}=[0.014166,0.985834]`,
    String.raw`d_k=2,\quad d_v=2`,
  ]) {
    expect(
      annotations.map(normalizeMath).some((formula) => formula.includes(normalizeMath(expected))),
      `expected a rendered formula containing ${expected}`,
    ).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  await expectFormulaGeometry(page);

  const history = page
    .getByRole('heading', {
      level: 2,
      name: 'From recurrent context to all-position retrieval',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From recurrent context to all-position retrieval"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain('fixed-length vector');
  expect(historyText).toContain('previous decoder state');
  expect(historyText).toContain('retrospective classification');
  expect(historyText).toContain('pack multiple queries into matrices');
  expect(historyText).toContain('road to modern LLMs');
  expect(historyText).toContain('does not make autoregressive token generation parallel');
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(2);

  await expect(page.locator('figure.rust-source')).toHaveCount(6);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'self-attention' });
  const diagram = page.locator('figure[data-visualization-id="self-attention"]');
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram.locator('[data-input-role]')).toHaveCount(3);
  await expect(diagram.locator('[data-input-role]').first()).toHaveAttribute(
    'data-input-role',
    'query',
  );
  await expect(diagram.locator('[data-input-role]').nth(1)).toHaveAttribute(
    'data-input-role',
    'key',
  );
  await expect(diagram.locator('[data-input-role]').nth(2)).toHaveAttribute(
    'data-input-role',
    'value',
  );
  await expect(diagram.locator('[data-score-kind="dot-products"]')).toContainText('6.000000');
  await expect(diagram.locator('[data-score-kind="scaled-scores"]')).toContainText('4.242641');
  await expect(diagram.locator('[data-probability-row]')).toHaveCount(2);
  await expect(diagram.locator('[data-probability-row="0"]')).toContainText('0.985834');
  await expect(diagram.locator('[data-probability-row="1"]')).toContainText('0.999151');
  await expect(diagram.locator('[data-mixture-row="0"]')).toContainText('1.028332');
  await expect(diagram.locator('[data-mixture-row="1"]')).toContainText('-2.994908');
  await expect(diagram.locator('.backward-card')).toContainText('0.079000');
  await expect(diagram.locator('.shape-card')).toContainText('[2,2,2]');
  await expect(diagram.locator('.single-card')).toContainText('query_gradient_zero=true');
  await expect(diagram.locator('.errors-card li')).toHaveCount(5);
  await expect(diagram.locator('.proof-card')).toContainText('gradcheck=true');
  await expect(diagram.locator('.proof-card')).toContainText('replay=bitwise');
  await expect(diagram.locator('[data-history-kind]')).toHaveCount(3);
  await expect(diagram.locator('[data-history-kind="earlier"]')).toContainText(
    'recurrent-fixed-context',
  );
  await expect(diagram.locator('[data-history-kind="transformer"]')).toContainText(
    'all-sequence-positions',
  );

  const positions = await diagram.locator('[data-input-role]').evaluateAll((cards) =>
    cards.map((card) => {
      const rectangle = card.getBoundingClientRect();
      return { left: rectangle.left, right: rectangle.right, top: rectangle.top };
    }),
  );
  expect(positions[0].right).toBeLessThan(positions[1].left);
  expect(positions[1].right).toBeLessThan(positions[2].left);
  expect(Math.abs(positions[0].top - positions[1].top)).toBeLessThan(1);

  await expectDiagramContainment(page, narrow);
  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(9);
  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 27 self-attention vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 27 while its Russian route remains deferred', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(27);
    expect(english[26]).toEqual(
      expect.objectContaining({ chapterId, order: 27, title: chapterTitle }),
    );
    const russian = await readOrderedCourseChapters(page, 'ru');
    expect(russian.length).toBeGreaterThan(0);
    const lastRussianChapter = russian[russian.length - 1]!;
    await page.goto(chapterPath('ru', lastRussianChapter.chapterId));
    await expectOrderedChapterNavigation(
      page,
      'ru',
      lastRussianChapter.chapterId,
      russian,
    );
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

  test('the Rust-backed lesson and natural-height calculation render at desktop and narrow widths', async ({
    page,
  }) => {
    const chapters = await readOrderedCourseChapters(page, 'en');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(chapterPath('en', chapterId));
    await expectChapterContent(page, chapters, false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectChapterContent(page, chapters, true);
  });

  test('solid, dashed, and double input cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="self-attention"]');
    await expect(diagram.locator('[data-input-role="query"]')).toHaveCSS(
      'border-top-style',
      'solid',
    );
    await expect(diagram.locator('[data-input-role="key"]')).toHaveCSS(
      'border-top-style',
      'dashed',
    );
    await expect(diagram.locator('[data-input-role="value"]')).toHaveCSS(
      'border-top-style',
      'double',
    );
    await expectNoOverflowOrClientScripts(page);
  });

  test('RTL prose keeps formulas and technical values left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="self-attention"]');
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

  test('the lesson and exact attention trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('[data-score-kind="dot-products"]')).toContainText('6.000000');
    await expect(page.locator('[data-probability-row="0"]')).toContainText('0.014166');
    await expect(page.locator('[data-mixture-row="1"]')).toContainText('-2.994908');
    await expect(page.locator('.errors-card li')).toHaveCount(5);
    await expect(page.locator('.proof-card')).toContainText('trace=rust-authored');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
