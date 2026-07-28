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

const chapterId = '26-qkv-projections';
const chapterTitle = 'Create query, key, and value views';
const chapterDescription =
  'Learn how Transformer self-attention creates query, key, and value tensors from one hidden-state sequence with bias-free Rust projections and explicit shapes.';
const diagramTitle = 'Split one hidden sequence into three learned views';
const diagramDescription =
  'Follow exact Rust-authored input, weight, output, gradient, history, empty-shape, and rejected-boundary evidence without performing attention arithmetic in the page.';
const chapterHeadings = [
  'Predict three outputs from one sequence',
  'Project the final feature axis three ways',
  'Keep roles, axes, and dimensions separate',
  'From learned alignment to self-attention projections',
  'Compose three existing differentiable linear layers',
  'Inspect the split without browser-side tensor arithmetic',
  'Predict before reading the evidence',
  'Compare queries with keys and mix values next',
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
            if (renderedTop < rect.top - 1) {
              issues.push(`${source} clips its upper rendered limit`);
            }
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
            '.source-card, .branch-card, .evidence-card, td, th, p, li',
          );
          if (
            owner &&
            !element.closest(
              '.input-values-scroller, .branches-scroller, .history-scroller, .gradients-scroller, .input-gradient-scroller, .formula-scroller',
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
  const diagram = page.locator('figure[data-visualization-id="qkv-projections"]');
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(
      node.querySelectorAll<HTMLElement>('.source-card, .branch-card, .evidence-card'),
    ).map((card) => ({
      clientHeight: card.clientHeight,
      scrollHeight: card.scrollHeight,
      clientWidth: card.clientWidth,
      scrollWidth: card.scrollWidth,
    })),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
  for (const card of result.cards) {
    expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight + 2);
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 2);
  }

  const scrollers = diagram.locator(
    '.input-values-scroller, .branches-scroller, .history-scroller, .input-gradient-scroller, .gradients-scroller',
  );
  await expect(scrollers).toHaveCount(5);
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
    order: 26,
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
    String.raw`Q=XW_Q,\quad K=XW_K,\quad V=XW_V`,
    String.raw`W_Q,W_K,W_V\in\mathbb{R}^{d_{model}\times d_{head}}`,
    String.raw`Q,K,V\in\mathbb{R}^{B\times T\times d_{head}}`,
    String.raw`L=\langle Q,U_Q\rangle+\langle K,U_K\rangle+\langle V,U_V\rangle`,
    String.raw`\bar X=\begin{bmatrix}3&1.5&1.5\\-1.5&3.5&-5\end{bmatrix}`,
    String.raw`\operatorname{shape}(Q)=[1,2,2]`,
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
      name: 'From learned alignment to self-attention projections',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From learned alignment to self-attention projections"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain('previous decoder state');
  expect(historyText).toContain('each encoder annotation');
  expect(historyText).toContain('retrospective bridge');
  expect(historyText).toContain('all three inputs come from the same previous-layer sequence');
  expect(historyText).toContain('road to modern LLMs');
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(2);

  await expect(page.locator('figure.rust-source')).toHaveCount(7);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'qkv-projections' });
  const diagram = page.locator('figure[data-visualization-id="qkv-projections"]');
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram.locator('[data-stage="input"]')).toContainText('1.000000');
  await expect(diagram.locator('[data-qkv-role]')).toHaveCount(3);
  await expect(diagram.locator('[data-qkv-role]').first()).toHaveAttribute('data-qkv-role', 'query');
  await expect(diagram.locator('[data-qkv-role]').nth(1)).toHaveAttribute('data-qkv-role', 'key');
  await expect(diagram.locator('[data-qkv-role]').nth(2)).toHaveAttribute('data-qkv-role', 'value');
  await expect(diagram.locator('[data-qkv-role="query"]')).toContainText('0.000000');
  await expect(diagram.locator('[data-qkv-role="query"]')).toContainText('3.000000');
  await expect(diagram.locator('[data-qkv-role="key"]')).toContainText('-1.000000');
  await expect(diagram.locator('[data-qkv-role="value"]')).toContainText('-3.000000');
  await expect(diagram).toContainText('decoder.block.0.attention.query.weight');
  await expect(diagram).toContainText('decoder.block.0.attention.key.weight');
  await expect(diagram).toContainText('decoder.block.0.attention.value.weight');
  await expect(diagram.locator('.independence-card')).toContainText('bitwise-unchanged');
  await expect(diagram.locator('.empty-card')).toContainText('[0,2,3]');
  await expect(diagram.locator('.empty-card')).toContainText('[2,0,3]');
  await expect(diagram.locator('.errors-card li')).toHaveCount(3);
  await expect(diagram.locator('.errors-card')).toContainText('must have rank three');
  await expect(diagram.locator('.proof-card')).toContainText('gradcheck=true');
  await expect(diagram.locator('.proof-card')).toContainText('replay=bitwise');
  await expect(diagram.locator('.proof-card')).toContainText('initialization=transactional');
  await expect(diagram.locator('[data-history-kind]')).toHaveCount(2);
  await expect(diagram.locator('[data-history-kind="earlier-attention"]')).toContainText(
    'decoder-state',
  );
  await expect(diagram.locator('[data-history-kind="self-attention"]')).toContainText(
    'one-sequence',
  );

  const positions = await diagram.locator('[data-qkv-role]').evaluateAll((branches) =>
    branches.map((branch) => {
      const rectangle = branch.getBoundingClientRect();
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

test.describe('chapter 26 Q/K/V projections vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 26 while its Russian route remains deferred', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(26);
    expect(english[25]).toEqual(
      expect.objectContaining({ chapterId, order: 26, title: chapterTitle }),
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

  test('the Rust-backed lesson and natural-height split render at desktop and narrow widths', async ({
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

  test('solid, dashed, and double projection cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="qkv-projections"]');
    await expect(diagram.locator('[data-qkv-role="query"]')).toHaveCSS(
      'border-top-style',
      'solid',
    );
    await expect(diagram.locator('[data-qkv-role="key"]')).toHaveCSS(
      'border-top-style',
      'dashed',
    );
    await expect(diagram.locator('[data-qkv-role="value"]')).toHaveCSS(
      'border-top-style',
      'double',
    );
    await expectNoOverflowOrClientScripts(page);
  });

  test('RTL prose keeps formulas and technical values left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="qkv-projections"]');
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

  test('the lesson and exact projection trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('[data-qkv-role="query"]')).toContainText('2.000000');
    await expect(page.locator('[data-qkv-role="value"]')).toContainText('-3.000000');
    await expect(page.locator('.errors-card li')).toHaveCount(3);
    await expect(page.locator('.proof-card')).toContainText('trace=rust-authored');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
