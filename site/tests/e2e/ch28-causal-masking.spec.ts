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

const chapterId = '28-causal-masking';
const chapterTitle = 'Block future keys with a causal mask';
const chapterDescription =
  'Learn how a lower-triangular causal mask blocks future Transformer keys, makes future probabilities exactly zero, and preserves earlier outputs in Rust.';
const diagramTitle = 'See the causal boundary in every attention row';
const diagramDescription =
  'Read the exact Rust-authored inputs, triangular visibility rule, masked scores, probabilities, outputs, perturbation, gradients, errors, and history without recomputing attention in the page.';
const chapterHeadings = [
  'Predict the visible triangle',
  'Mask before softmax',
  'Keep visibility separate from position',
  'From recurrent prefix state to an explicit decoder mask',
  'Keep the mask inspectable and the tape finite',
  'Read the Rust trace as a lower triangle',
  'Predict before opening the answers',
  'Preserve the prefix boundary as the decoder grows',
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
        if (getComputedStyle(element).direction !== 'ltr') {
          issues.push(`${source} is not left-to-right`);
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
            const top = Math.min(...renderedBoxes.map((rendered) => rendered.top));
            const bottom = Math.max(...renderedBoxes.map((rendered) => rendered.bottom));
            if (top < rect.top - 1) issues.push(`${source} clips its upper rendered limit`);
            if (bottom > rect.bottom + 1) issues.push(`${source} clips its lower rendered limit`);
          }
          const owner = element.parentElement;
          const next = owner?.nextElementSibling as HTMLElement | null;
          if (owner && next && owner.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1) {
            issues.push(`${source} overlaps the following block`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectDiagramContainment(page: Page, narrow: boolean) {
  const diagram = page.locator('figure[data-visualization-id="causal-masking"]');
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(
      node.querySelectorAll<HTMLElement>(
        '.input-card, .triangle-card, .compact-card, .evidence-card, .history-card',
      ),
    ).map((card) => ({
      label: card.getAttribute('data-input-role') ?? card.className,
      clientHeight: card.clientHeight,
      scrollHeight: card.scrollHeight,
      clientWidth: card.clientWidth,
      scrollWidth: card.scrollWidth,
    })),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
  for (const card of result.cards) {
    expect(card.scrollHeight, `${card.label} vertical containment`).toBeLessThanOrEqual(
      card.clientHeight + 2,
    );
    expect(card.scrollWidth, `${card.label} horizontal containment`).toBeLessThanOrEqual(
      card.clientWidth + 2,
    );
  }

  const scrollers = diagram.locator(
    '.inputs-scroller, .triangles-scroller, .output-scroller, .prefix-scroller, .gradients-scroller, .history-scroller',
  );
  await expect(scrollers).toHaveCount(6);
  const problems = await scrollers.evaluateAll((nodes) =>
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
  expect(problems).toEqual([]);
  for (const scroller of await scrollers.all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
    if (narrow) {
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
    order: 28,
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
    String.raw`M_{ij}=\begin{cases}0&j\le i\\-\infty&j>i\end{cases},\quad A=\operatorname{softmax}(S+M)`,
    String.raw`A=\operatorname{softmax}(S+M),\qquad O=AV`,
    String.raw`\sum_{j=0}^{i}A_{bij}=1`,
    String.raw`A_{bij}=0\quad\text{when }j>i`,
    String.raw`\bar S_{bij}=0\quad\text{when }j>i`,
    String.raw`\frac{\partial L_{\le1}}{\partial q_2}`,
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
      name: 'From recurrent prefix state to an explicit decoder mask',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From recurrent prefix state to an explicit decoder mask"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain('future generated elements do not exist yet');
  expect(historyText).toContain('pack query positions into matrices');
  expect(historyText).toContain('shifted by one position');
  expect(historyText).toContain('road to modern LLMs');
  expect(historyText).toContain('generation still emits one new token at a time');
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(2);

  await expect(page.locator('figure.rust-source')).toHaveCount(6);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'causal-masking' });
  const diagram = page.locator('figure[data-visualization-id="causal-masking"]');
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram.locator('[data-input-role]')).toHaveCount(3);
  await expect(diagram.locator('[data-causal-stage="mask"] td[data-visibility="allowed"]')).toHaveCount(6);
  await expect(diagram.locator('[data-causal-stage="mask"] td[data-visibility="blocked"]')).toHaveCount(3);
  await expect(diagram.locator('[data-causal-stage="mask"] td[data-diagonal="true"]')).toHaveCount(3);
  await expect(diagram.locator('[data-causal-stage="mask"] td[data-visibility="blocked"]').first()).toContainText('−∞');
  await expect(diagram.locator('[data-causal-stage="probabilities"] td[data-visibility="blocked"]')).toHaveText([
    /0\.000000.*Blocked/,
    /0\.000000.*Blocked/,
    /0\.000000.*Blocked/,
  ]);
  await expect(diagram.locator('.row-sums li')).toHaveText([
    /q0.*1\.000000/,
    /q1.*1\.000000/,
    /q2.*1\.000000/,
  ]);
  await expect(diagram.locator('[data-prefix-position="0"]')).toHaveAttribute('data-prefix-status', 'bitwise-unchanged');
  await expect(diagram.locator('[data-prefix-position="1"]')).toHaveAttribute('data-prefix-status', 'bitwise-unchanged');
  await expect(diagram.locator('[data-prefix-position="2"]')).toHaveAttribute('data-prefix-status', 'changed');
  await expect(diagram.locator('[data-prefix-position="2"]')).toContainText('3.287932');
  await expect(diagram.locator('[data-evidence-kind="prefix-zero"]')).toContainText('suffix_zero=true');
  await expect(diagram.locator('[data-evidence-kind="prefix-gradient"]')).toContainText('0.000000');
  await expect(diagram.locator('.error-list li')).toHaveCount(6);
  await expect(diagram.locator('.error-list li code').first()).toHaveText('empty-tokens');
  await expect(diagram.getByRole('region', {
    name: 'Scrollable causal attention output mixtures',
  })).toBeVisible();
  await expect(diagram.locator('.proof-card')).toContainText('tape_finite=true');
  await expect(diagram.locator('.proof-card')).toContainText('future_probabilities=exact-zero');
  await expect(diagram.locator('.earlier-card')).toContainText('available-prefix');
  await expect(diagram.locator('.transformer-card')).toContainText('generation=sequential');

  await expectDiagramContainment(page, narrow);
  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(7);
  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 28 causal masking vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 28 while its Russian route remains deferred', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(28);
    expect(english[27]).toEqual(
      expect.objectContaining({ chapterId, order: 28, title: chapterTitle }),
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

  test('the Rust-backed lesson and natural-height triangles render at desktop and narrow widths', async ({
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

  test('allowed, blocked, and diagonal cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="causal-masking"]');
    await expect(diagram.locator('[data-causal-stage="mask"] td[data-visibility="allowed"]').nth(1)).toHaveCSS('border-top-style', 'solid');
    await expect(diagram.locator('[data-causal-stage="mask"] td[data-visibility="blocked"]').first()).toHaveCSS('border-top-style', 'dashed');
    await expect(diagram.locator('[data-causal-stage="mask"] td[data-diagonal="true"]').first()).toHaveCSS('border-top-style', 'double');
    await expectNoOverflowOrClientScripts(page);
  });

  test('RTL prose keeps formulas and technical values left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="causal-masking"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
    await expect(diagram.locator('.input-card h6').first()).toHaveCSS('direction', 'rtl');
    expect(
      await diagram.locator('.input-grid, .triangle-grid, .matrix-table, .evidence-table')
        .evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).direction === 'ltr')),
    ).toBe(true);
    const columnLefts = await diagram.locator('[data-causal-stage="mask"] thead th')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().left));
    expect(columnLefts).toEqual([...columnLefts].sort((left, right) => left - right));
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

  test('the lesson and exact causal trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('[data-causal-stage="mask"] td[data-visibility="blocked"]')).toHaveCount(3);
    await expect(page.locator('[data-prefix-position="0"]')).toContainText('bitwise-unchanged');
    await expect(page.locator('[data-evidence-kind="prefix-zero"]')).toContainText('suffix_zero=true');
    await expect(page.locator('.proof-card')).toContainText('tape_finite=true');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
