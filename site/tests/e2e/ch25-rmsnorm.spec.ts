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

const chapterId = '25-rmsnorm';
const chapterTitle = 'Normalize scale without subtracting the mean';
const chapterDescription =
  'Implement last-axis RMSNorm, trace its input and gain gradients, and separate ideal scale invariance from epsilon-dominated behavior near zero.';
const diagramDescription =
  'Read exact Rust-authored values from input through RMS rescaling and learned gain, then compare scale, history, gradient, and rejected-boundary evidence.';
const chapterHeadings = [
  'Predict RMS, then test the epsilon boundary',
  'Normalize the final feature axis',
  'Keep scale, gain, and axes distinct',
  'From batch statistics to pre-RMSNorm language models',
  'Compose RMSNorm from cumulative tape operations',
  'Follow rescaling without inventing browser arithmetic',
  'Predict before reading the evidence',
  'Project normalized features into query, key, and value tensors next',
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
            '.stage-card, .scale-card, .evidence-card, .proof-row article, td, th, p, li',
          );
          if (owner && !element.closest('.formula-scroller')) {
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

async function expectDiagramContainment(page: Page) {
  const diagram = page.locator('figure[data-visualization-id="rmsnorm"]');
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(
      node.querySelectorAll<HTMLElement>(
        '.stage-card, .scale-card, .evidence-card, .proof-row article',
      ),
    ).map((card) => ({ clientHeight: card.clientHeight, scrollHeight: card.scrollHeight })),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
  for (const card of result.cards) {
    expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight + 2);
  }

  const scrollerProblems = await diagram
    .locator('.primary-scroller, .scale-scroller, .history-scroller, .formula-scroller')
    .evaluateAll((nodes) =>
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
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 25,
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
    String.raw`\operatorname{RMSNorm}(x)=`,
    String.raw`\operatorname{RMSNorm}_{0}(ax)=\operatorname{RMSNorm}_{0}(x)`,
    String.raw`\operatorname{mean}(\hat{x}^2)=`,
    String.raw`\bar x=[0.407293,-0.305470]`,
    String.raw`\bar g=[0.848528,-2.262741]`,
    String.raw`\Delta_{\mathrm{max}}=0.717566`,
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
      name: 'From batch statistics to pre-RMSNorm language models',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From batch statistics to pre-RMSNorm language models"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain('BatchNorm couples a training example to mini-batch statistics');
  expect(historyText).toContain('avoiding dependencies between training cases');
  expect(historyText).toContain('remove the mean statistic, normalize by RMS');
  expect(historyText).toContain('normalize the input of each Transformer sublayer');
  expect(historyText).toContain('The history is about normalization choices');
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(4);

  await expect(page.locator('figure.rust-source')).toHaveCount(8);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'rmsnorm' });
  const diagram = page.locator('figure[data-visualization-id="rmsnorm"]');
  await expect(diagram).toHaveAccessibleName('Follow one feature vector through RMSNorm');
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram.locator('[data-stage="input"]')).toContainText('3.000000');
  await expect(diagram.locator('[data-stage="statistic"]')).toContainText('12.500000');
  await expect(diagram.locator('[data-stage="normalized"]')).toContainText('1.131370');
  await expect(diagram.locator('[data-stage="output"]')).toContainText('1.272792');
  await expect(diagram.locator('[data-scale-mode="ideal"]')).toContainText('0.000000000');
  await expect(diagram.locator('[data-scale-mode="production"]')).toContainText('0.000000448');
  await expect(diagram.locator('[data-scale-mode="near-zero"]')).toContainText('0.717566');
  await expect(diagram.locator('[data-history-method]')).toHaveCount(3);
  await expect(diagram.locator('[data-history-method="batchnorm"]')).toContainText('-0.999999');
  await expect(diagram.locator('[data-history-method="batchnorm"]')).toContainText('0.000000');
  await expect(diagram.locator('[data-evidence="errors"] li')).toHaveCount(3);
  await expect(diagram.locator('[data-evidence="errors"]')).toContainText(
    'zero mean square',
  );
  await expect(diagram.locator('[data-evidence="parameter"]')).toContainText('no_decay=true');
  await expect(diagram.locator('[data-evidence="proof"]')).toContainText('gradcheck=true');
  await expect(diagram.locator('[data-evidence="proof"]')).toContainText('replay=bitwise');
  await expect(diagram.locator('[data-evidence="proof"]')).toContainText('site_arithmetic=none');

  for (const scroller of await diagram
    .locator('.primary-scroller, .scale-scroller, .history-scroller, .formula-scroller')
    .all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
  await expectDiagramContainment(page);

  const flow = await diagram.locator('.primary-flow').evaluate((node) => {
    const rect = (selector: string) =>
      (node.querySelector<HTMLElement>(selector) as HTMLElement).getBoundingClientRect();
    return {
      input: rect('[data-stage="input"]'),
      statistic: rect('[data-stage="statistic"]'),
      normalized: rect('[data-stage="normalized"]'),
      output: rect('[data-stage="output"]'),
    };
  });
  expect(flow.input.right).toBeLessThan(flow.statistic.left);
  expect(flow.statistic.right).toBeLessThan(flow.normalized.left);
  expect(flow.normalized.right).toBeLessThan(flow.output.left);

  if (narrow) {
    for (const selector of ['.primary-scroller', '.scale-scroller', '.history-scroller']) {
      const width = await diagram.locator(selector).evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(width.scroll).toBeGreaterThan(width.client);
    }
  }

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(9);
  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 25 RMSNorm vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('English publishes Chapter 25 while its Russian route remains deferred', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(25);
    expect(english[24]).toEqual(
      expect.objectContaining({ chapterId, order: 25, title: chapterTitle }),
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

  test('the Rust-backed lesson and natural-height evidence render at desktop and narrow widths', async ({
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

  test('solid, dashed, and double cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="rmsnorm"]');
    await expect(diagram.locator('[data-stage="input"]')).toHaveCSS('border-top-style', 'solid');
    await expect(diagram.locator('[data-stage="normalized"]')).toHaveCSS(
      'border-top-style',
      'dashed',
    );
    await expect(diagram.locator('[data-stage="output"]')).toHaveCSS(
      'border-top-style',
      'double',
    );
    await expectNoOverflowOrClientScripts(page);
  });

  test('RTL prose mirrors arrows while formulas and technical values remain left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="rmsnorm"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
    await expect(diagram.locator('.flow-arrow').first()).not.toHaveCSS('transform', 'none');
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
    await expect(page.locator('[data-stage="output"]')).toContainText('1.272792');
    await expect(page.locator('[data-scale-mode="near-zero"]')).toContainText('0.717566');
    await expect(page.locator('[data-history-method]')).toHaveCount(3);
    await expect(page.locator('[data-evidence="errors"] li')).toHaveCount(3);
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
