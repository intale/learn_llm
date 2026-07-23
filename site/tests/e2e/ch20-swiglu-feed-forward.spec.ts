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

const chapterId = '20-swiglu-feed-forward';
const chapterTitle = 'Let one learned branch gate another';
const chapterDescription =
  'Build a position-wise SwiGLU feed-forward layer, follow its activated gate and linear up branches, and verify exact outputs and gradients.';
const chapterHeadings = [
  'Predict the two branch products',
  'Activate one branch, then multiply',
  'Expand features without mixing positions',
  'From nonlinear neural language models to SwiGLU',
  'Compose the cumulative differentiable operations',
  'Trace the gate, merge, and reverse split',
  'Predict before checking the executable evidence',
  'Hand the nonlinear token transform to batching',
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
          if (container && next && container.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1) {
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
    order: 20,
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
    String.raw`\operatorname{FFN}(X)=\left(\operatorname{SiLU}(XW_g)\odot(XW_u)\right)W_2`,
    String.raw`\operatorname{SiLU}(z)=z\sigma(z)`,
    String.raw`dA &= dS\odot\operatorname{SiLU}'(A)`,
    String.raw`dX_{0}`,
    String.raw`h_{1}=s_{1}\odot u_{1}`,
  ]) {
    expect(
      annotations.map(normalizeMath).some((formula) => formula.includes(normalizeMath(expected))),
      `expected a rendered formula containing ${expected}`,
    ).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  const code = await page.locator('.lesson-body :not(pre) > code').allTextContents();
  for (const expression of ['XW_g', 'XW_u', 'dX_p', 'dW_g', 'dW_u', 'dW_2']) {
    expect(code).not.toContain(expression);
  }
  await expectFormulaGeometry(page);

  const history = page
    .getByRole('heading', {
      level: 2,
      name: 'From nonlinear neural language models to SwiGLU',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From nonlinear neural language models to SwiGLU"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain('road from nonlinear neural-language-model computation to modern LLM');
  expect(historyText).toContain('does not prove why SwiGLU works');
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(3);

  await expect(page.locator('figure.rust-source')).toHaveCount(9);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'swiglu-feed-forward' });
  const diagram = page.locator('figure[data-visualization-id="swiglu-feed-forward"]');
  await expect(diagram).toHaveAccessibleName(
    'Follow two projected branches through one position-wise SwiGLU layer',
  );
  await expect(diagram).toHaveAccessibleDescription(
    'Read exact Rust-authored forward values, branch gradients, shared-parameter gradients, and a position-independence probe for the frozen two-position fixture.',
  );
  await expect(diagram.locator('.shape-summary dd')).toHaveText([
    '2',
    '3',
    '2',
    'Bias-free',
    '18',
    '[2, 2]',
    '[2, 3]',
    '[2, 2]',
  ]);
  await expect(diagram.locator('.position-card')).toHaveCount(2);
  await expect(diagram.locator('.position-card[data-position="0"]')).toContainText(
    '[1.924234314520, -2.193175735890]',
  );
  await expect(diagram.locator('.position-card[data-position="1"]')).toContainText(
    '[-0.268941421370, 1.731058578630]',
  );
  await expect(diagram.locator('.independence-proof dd')).toHaveText([
    '0',
    '[0.000000000000, 0.000000000000]',
    '1',
    '[-0.268941421370, 1.731058578630]',
    '[-0.268941421370, 1.731058578630]',
    'Unchanged',
  ]);
  await expect(diagram.locator('.gradients-stage tbody tr')).toHaveCount(5);
  await expect(diagram.locator('.gradients-stage tbody tr').last()).toContainText(
    'ffn.down.weight',
  );

  const scroller = diagram.locator('.gradient-scroll');
  await expect(scroller).toHaveAttribute('role', 'region');
  await expect(scroller).toHaveAccessibleName('Scrollable SwiGLU gradient evidence');
  await scroller.focus();
  await expect(scroller).toBeFocused();

  const containment = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(node.querySelectorAll<HTMLElement>('.position-card, .branch')).map((card) => ({
      clientHeight: card.clientHeight,
      scrollHeight: card.scrollHeight,
    })),
  }));
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth);
  for (const card of containment.cards) {
    expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight + 2);
  }
  if (narrow) {
    const branchTops = await diagram
      .locator('.position-card[data-position="0"] .branch')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    expect(branchTops[1]).toBeGreaterThan(branchTops[0]);
    const positionTops = await diagram
      .locator('.position-card')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    expect(positionTops[1]).toBeGreaterThan(positionTops[0]);
    const width = await scroller.evaluate((node) => ({
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

test.describe('chapter 20 SwiGLU feed-forward vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 20 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(20);
    expect(english[19]).toEqual(
      expect.objectContaining({ chapterId, order: 20, title: chapterTitle }),
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

  test('gate, up, merge, and down stages remain distinct in forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="swiglu-feed-forward"]');
    await expect(diagram.locator('.gate-branch').first()).toHaveCSS('border-left-style', 'solid');
    await expect(diagram.locator('.up-branch').first()).toHaveCSS('border-left-style', 'double');
    await expect(diagram.locator('.merge-stage').first()).toHaveCSS('border-left-style', 'dashed');
    await expect(diagram.locator('.down-stage').first()).toHaveCSS('border-left-style', 'double');
    await expectNoOverflowOrClientScripts(page);
  });

  test('localized labels inherit RTL while technical evidence remains left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="swiglu-feed-forward"]');
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
    await expect(page.locator('.position-card')).toHaveCount(2);
    await expect(page.locator('.gradients-stage tbody tr')).toHaveCount(5);
    await expect(page.locator('.independence-proof')).toContainText('Unchanged');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
