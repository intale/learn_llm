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

const chapterId = '29-rope';
const chapterTitle = 'Turn query and key pairs with RoPE';
const chapterDescription =
  'Learn how rotary position embeddings turn query and key feature pairs by absolute position so relative offsets appear in attention dot products, with a tested Rust implementation.';
const diagramTitle = 'Watch absolute rotations reveal relative query-key offsets';
const diagramDescription =
  'Read exact Rust-authored frequencies, pair rotations, dot products, common-shift evidence, gradients, shapes, errors, and LLM history without recomputing RoPE in the page.';
const chapterHeadings = [
  'Predict one pair before looking at the table',
  'Rotate adjacent coordinates by absolute position',
  'Keep position, pair, and visibility roles distinct',
  'From recurrent order to rotary score geometry',
  'Precompute once, rotate each query and key row',
  'Read the pair rotations and relative diagonals',
  'Predict, then check the invariant',
  'Hand the position-aware axis to multiple heads',
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
        const { direction, overflowY } = getComputedStyle(element);
        if (direction !== 'ltr') {
          issues.push(`${source} is not left-to-right`);
        }
        if (
          ['auto', 'clip', 'hidden', 'scroll'].includes(overflowY) &&
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
            const top = Math.min(...renderedBoxes.map((rendered) => rendered.top));
            const bottom = Math.max(...renderedBoxes.map((rendered) => rendered.bottom));
            if (top < rect.top - 1) issues.push(`${source} clips its upper rendered limit`);
            if (bottom > rect.bottom + 1) issues.push(`${source} clips its lower rendered limit`);
          }
          const owner = element.parentElement;
          const next = owner?.nextElementSibling as HTMLElement | null;
          if (
            owner &&
            next &&
            owner.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1
          ) {
            issues.push(`${source} overlaps the following block`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectDiagramContainment(page: Page, narrow: boolean) {
  const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(
      node.querySelectorAll<HTMLElement>('.shift-card, .evidence-card, .history-card'),
    ).map((card) => ({
      label: card.className,
      clientHeight: card.clientHeight,
      scrollHeight: card.scrollHeight,
      clientWidth: card.clientWidth,
      scrollWidth: card.scrollWidth,
    })),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  for (const card of result.cards) {
    expect(card.scrollHeight, `${card.label} vertical containment`).toBeLessThanOrEqual(
      card.clientHeight + 2,
    );
    expect(card.scrollWidth, `${card.label} horizontal containment`).toBeLessThanOrEqual(
      card.clientWidth + 2,
    );
  }

  const scrollers = diagram.locator(
    '.rotation-scroller, .dot-scroller, .shift-scroller, .gradient-scroller, .history-scroller',
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
    order: 29,
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
    String.raw`\left(\operatorname{RoPE}(x_m)\right)_{2k:2k+2}=R(m\theta_k)(x_m)_{2k:2k+2}`,
    String.raw`R(\phi)=\begin{bmatrix}\cos\phi&-\sin\phi\\\sin\phi&\cos\phi\end{bmatrix},\qquad\theta_k=b^{-2k/d}`,
    String.raw`R(a)^\top R(b)=R(b-a)`,
    String.raw`\begin{bmatrix}\bar{x}_{2k}\\\bar{x}_{2k+1}\end{bmatrix}=R(m\theta_k)^\top`,
    String.raw`\theta_0=1.000000`,
    String.raw`\varepsilon=0.000000000001`,
    String.raw`12+12`,
    String.raw`\varepsilon_g=0.000004`,
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
      name: 'From recurrent order to rotary score geometry',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From recurrent order to rotary score geometry"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain('road to modern LLMs');
  expect(historyText).toContain('position encodings to the input embeddings');
  expect(historyText).toContain('rotations of query and key subspaces');
  expect(historyText).toContain('original LLaMA');
  expect(historyText).not.toMatch(/TypeScript validates|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(3);

  await expect(page.locator('figure.rust-source')).toHaveCount(7);
  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'rotary-position-pairs',
  });
  const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram.locator('.rotation-table tbody tr')).toHaveCount(6);
  await expect(diagram.locator('.rotation-table tbody tr.fast-pair')).toHaveCount(3);
  await expect(diagram.locator('.rotation-table tbody tr.slow-pair')).toHaveCount(3);

  const dotCells = await diagram.locator('.dot-table td[data-relative-offset]').evaluateAll(
    (nodes) =>
      nodes.map((node) => ({
        query: node.getAttribute('data-query-position'),
        key: node.getAttribute('data-key-position'),
        offset: node.getAttribute('data-relative-offset'),
        dot: node.getAttribute('data-dot'),
      })),
  );
  expect(dotCells).toEqual([
    { query: '0', key: '0', offset: '0', dot: '2.000000' },
    { query: '0', key: '1', offset: '1', dot: '1.535306' },
    { query: '0', key: '2', offset: '2', dot: '0.563920' },
    { query: '1', key: '0', offset: '-1', dot: '1.535306' },
    { query: '1', key: '1', offset: '0', dot: '2.000000' },
    { query: '1', key: '2', offset: '1', dot: '1.535306' },
    { query: '2', key: '0', offset: '-2', dot: '0.563920' },
    { query: '2', key: '1', offset: '-1', dot: '1.535306' },
    { query: '2', key: '2', offset: '0', dot: '2.000000' },
  ]);

  const originalGrid = await diagram
    .locator('[data-shift-grid="original"] td annotation[encoding="application/x-tex"]')
    .allTextContents();
  const shiftedGrid = await diagram
    .locator('[data-shift-grid="shifted"] td annotation[encoding="application/x-tex"]')
    .allTextContents();
  expect(shiftedGrid).toEqual(originalGrid);
  await expect(diagram.locator('[data-common-shift="true"]')).toContainText('Verified');
  await expect(diagram.locator('[data-norm-preserved="true"]')).toContainText('Verified');
  await expect(diagram.locator('[data-shape-case]')).toHaveCount(4);
  await expect(diagram.locator('[data-error-case]')).toHaveCount(6);
  await expect(diagram.locator('[data-error-case="odd-width"] code')).toHaveText(
    'odd-feature-width',
  );
  await expect(diagram.locator('[data-rope-proof]')).toContainText('Verified');
  await expect(diagram.locator('.earlier-stage')).toContainText('recurrent-order-in-state');
  await expect(diagram.locator('.transformer-stage')).toContainText(
    'absolute-vectors-added-to-embeddings',
  );
  await expect(diagram.locator('.rotary-stage')).toContainText(
    'absolute-qk-rotations-relative-dot',
  );
  await expect(diagram.locator('.modern-stage')).toContainText('llama-rope-each-layer');
  await expect(diagram.locator('.boundary-note')).toContainText('separate-mask');

  await expect(diagram.locator('table')).toHaveCount(5);
  await expect(diagram.locator('table caption')).toHaveCount(5);
  expect(await diagram.locator('th[scope="col"]').count()).toBeGreaterThan(0);
  expect(await diagram.locator('th[scope="row"]').count()).toBeGreaterThan(0);
  await expectDiagramContainment(page, narrow);

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(9);
  await expect(details).toContainText('relative offset emerges');
  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expect(
    page.locator('nav[data-chapter-navigation] a[data-chapter-direction="previous"]'),
  ).toHaveAttribute('data-chapter-id', '28-causal-masking');
  await expect(
    page.locator('nav[data-chapter-navigation] a[data-chapter-direction="next"]'),
  ).toHaveAttribute('data-chapter-id', '30-multi-head-attention');
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 29 rotary position embedding vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 29 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(29);
    expect(english[28]).toEqual(
      expect.objectContaining({ chapterId, order: 29, title: chapterTitle }),
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

  test('the Rust-backed lesson and natural-height diagram render at desktop and narrow widths', async ({
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

  test('pair-speed and relative-offset cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
    await expect(diagram.locator('.cue-list li')).toHaveText([
      'Fast pair: solid cue',
      'Slow pair: dashed cue',
      'Zero offset: double cue',
      'Key lies later: solid cue',
      'Key lies earlier: dashed cue',
    ]);
    await expect(diagram.locator('.cue-list li').first()).toHaveCSS('border-top-width', '2px');
    await expectNoOverflowOrClientScripts(page);
  });

  test('RTL prose keeps technical grids and formulas left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
    await expect(diagram.locator('.history-card h5').first()).toHaveCSS('direction', 'rtl');
    expect(
      await diagram
        .locator('.rotation-table, .dot-table, .compact-matrix, .gradient-table, .history-grid')
        .evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
        ),
    ).toBe(true);
    const columnLefts = await diagram
      .locator('.dot-table thead th')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().left));
    expect(columnLefts).toEqual([...columnLefts].sort((left, right) => left - right));
    expect(
      await diagram.locator('[data-inline-math]').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    await expectNoOverflowOrClientScripts(page);
  });

  test('the lesson and exact rotary trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('.rotation-table tbody tr')).toHaveCount(6);
    await expect(page.locator('.dot-table td[data-relative-offset]')).toHaveCount(9);
    await expect(page.locator('[data-common-shift="true"]')).toContainText('Verified');
    await expect(page.locator('[data-rope-proof]')).toContainText('Verified');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
