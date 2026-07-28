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

const chapterId = '30-multi-head-attention';
const chapterTitle = 'Run causal attention in several heads, then mix';
const chapterDescription =
  'Learn how full-width query, key, and value projections become separate rotary causal attention heads before concatenation and one learned output projection.';
const diagramTitle = 'Keep two causal attention lanes separate until the output projection';
const diagramDescription =
  'Follow exact Rust-authored projected rows, rotary query/key rows, causal probabilities, head outputs, concatenated rows, and output-projected rows without recomputing the model in the page.';
const chapterHeadings = [
  'Predict the boundaries before calculating probabilities',
  'Project into head views before scoring',
  'Keep the model, head, and token axes distinct',
  'From one recurrent alignment to parallel projected attention',
  'Keep the complete Rust path differentiable and inspectable',
  'See exactly where separate heads become one model-width row',
  'Test shape, visibility, and mixing—not a story about head roles',
  'Put this transformation on a pre-normalized residual path',
] as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, '');

async function expectFormulaGeometry(page: Page) {
  await page.evaluate(() => document.fonts.ready);
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
        ) issues.push(`${source} escapes the viewport`);
        if (rect.width <= 0 || rect.height <= 0) issues.push(`${source} has no visible box`);
        const struts = element.querySelectorAll<HTMLElement>(
          '.katex-html .strut, .katex-html .katex-strut',
        );
        if (struts.length === 0) issues.push(`${source} has no KaTeX layout strut`);
        for (const [strutIndex, strut] of Array.from(struts).entries()) {
          if (getComputedStyle(strut).display !== 'inline-block') {
            issues.push(`${source} strut ${strutIndex} is not laid out as inline-block`);
          }
        }
        const mathml = element.querySelector<HTMLElement>('.katex-mathml');
        if (mathml) {
          const mathmlStyle = getComputedStyle(mathml);
          if (mathmlStyle.display !== 'block' || mathmlStyle.overflowX !== 'clip') {
            issues.push(`${source} does not contain its accessible MathML projection`);
          }
        }
        const { direction, overflowY } = getComputedStyle(element);
        if (direction !== 'ltr') issues.push(`${source} is not left-to-right`);
        if (
          ['auto', 'clip', 'hidden', 'scroll'].includes(overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) issues.push(`${source} clips vertically`);
        if (element.classList.contains('katex-display')) {
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

  const matrix = await page.locator('.lesson-body .katex-display').evaluateAll((displays) => {
    const display = displays.find((candidate) =>
      candidate
        .querySelector('annotation[encoding="application/x-tex"]')
        ?.textContent?.includes('A^{(0)}='),
    ) as HTMLElement | undefined;
    if (!display) return { problems: ['missing the A^(0) causal-probability matrix'] };
    const base = display.querySelector<HTMLElement>('.katex');
    const sizing = Array.from(
      display.querySelectorAll<HTMLElement>(
        '.sizing.reset-size6.size3, .katex-sizing.reset-size6.size3',
      ),
    );
    const baseSize = base ? Number.parseFloat(getComputedStyle(base).fontSize) : 0;
    const sizes = sizing.map((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    const problems: string[] = [];
    if (sizing.length === 0) problems.push('matrix has no text-style fraction sizing');
    for (const [index, size] of sizes.entries()) {
      if (!(size > 0 && baseSize > 0 && size / baseSize < 0.85)) {
        problems.push(`fraction sizing ${index} is ${size}px against ${baseSize}px base`);
      }
    }
    return { problems, baseSize, sizes };
  });
  expect(matrix.problems).toEqual([]);
}

async function expectDiagramContainment(page: Page) {
  const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(
      node.querySelectorAll<HTMLElement>('.head-card, .proof-grid > div'),
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
  await expect(diagram.locator('.table-scroller')).toHaveCount(6);
  await expect(diagram.locator('.formula-scroller')).toHaveCount(3);
  const scrollers = diagram.locator('.table-scroller, .formula-scroller');
  await expect(scrollers).toHaveCount(9);
  const problems = await scrollers.evaluateAll((nodes) =>
    nodes.flatMap((node, index) => {
      const scroller = node as HTMLElement;
      const issues: string[] = [];
      if (!['auto', 'scroll'].includes(getComputedStyle(scroller).overflowX)) {
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
  }
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 30,
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
    String.raw`d_h=\frac{d_{\mathrm{model}}}{h}=2`,
    String.raw`[B,T,d_{\mathrm{model}}]\to[B,h,T,d_h]`,
    String.raw`A_i=\operatorname{softmax}_{\mathrm{keys}}`,
    String.raw`H_i=A_iV_i`,
    String.raw`\operatorname{MHA}(X)=\operatorname{Concat}(H_1,\ldots,H_h)W_O`,
    String.raw`W_O\in\mathbb{R}^{d_{\mathrm{model}}\times d_{\mathrm{model}}}`,
    String.raw`x'=x+\operatorname{MHA}(\operatorname{RMSNorm}(x))`,
  ]) {
    expect(
      annotations.map(normalizeMath).some((formula) => formula.includes(normalizeMath(expected))),
      `expected a rendered formula containing ${expected}`,
    ).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  await expectFormulaGeometry(page);

  const lessonText = (await page.locator('.lesson-body').innerText()).replace(/\s+/g, ' ');
  expect(lessonText).toContain('not Transformer self-attention');
  expect(lessonText).toContain('not a specialization guarantee');
  expect(lessonText).toContain('does not reproduce that optimized kernel');
  await expect(page.locator('.lesson-body a[href^="https://arxiv.org/abs/"]')).toHaveCount(3);
  await expect(page.locator('figure.rust-source')).toHaveCount(7);
  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'multi-head-attention-flow',
  });

  const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram.locator('[data-shape-stage]')).toHaveCount(8);
  await expect(diagram.locator('[data-head-partition]')).toHaveCount(2);
  await expect(diagram.locator('[data-attention-row]')).toHaveCount(6);
  await expect(diagram.locator('[data-visibility="allowed"]')).toHaveCount(12);
  await expect(diagram.locator('[data-visibility="blocked"]')).toHaveCount(6);
  await expect(diagram.locator('[data-head-output]')).toHaveCount(6);
  await expect(diagram.locator('[data-merged-row]')).toHaveCount(3);
  await expect(diagram.locator('[data-output-map-row]')).toHaveCount(4);
  await expect(diagram.locator('[data-final-output-row]')).toHaveCount(3);
  await expect(
    diagram.locator('[data-attention-row][data-head="0"][data-query="1"] annotation'),
  ).toHaveText([
    'q=1',
    '0.500000',
    '0.500000',
    '0.000000',
    '1.000000',
    '[0.770151,-0.420735]',
  ]);
  await expect(
    diagram.locator('[data-attention-row][data-head="1"][data-query="1"] annotation'),
  ).toHaveText([
    'q=1',
    '0.213809',
    '0.786191',
    '0.000000',
    '1.000000',
    '[0.213809,0.786191]',
  ]);
  await expect(diagram.locator('[data-merged-row="1"] annotation')).toHaveText([
    't=1',
    '[0.770151,-0.420735]',
    '[0.213809,0.786191]',
    '[0.770151,-0.420735,0.213809,0.786191]',
  ]);
  expect(
    await diagram.locator('[data-output-map-row]').evaluateAll((rows) =>
      rows.map((row) => row.getAttribute('data-output-map-values')),
    ),
  ).toEqual([
      '[0.000000,0.000000,1.000000,0.000000]',
      '[0.000000,0.000000,0.000000,1.000000]',
      '[1.000000,0.000000,0.000000,0.000000]',
      '[0.000000,1.000000,0.000000,0.000000]',
  ]);
  await expect(diagram.locator('[data-final-output-row="1"] annotation')).toHaveText([
    't=1',
    '[0.770151,-0.420735,0.213809,0.786191]',
    '[0.213809,0.786191,0.770151,-0.420735]',
  ]);
  await expect(diagram.locator('[data-prefix-position="0"]')).toHaveAttribute(
    'data-prefix-status',
    'bitwise-unchanged',
  );
  await expect(diagram.locator('[data-prefix-position="1"]')).toHaveAttribute(
    'data-prefix-status',
    'bitwise-unchanged',
  );
  await expect(diagram.locator('[data-prefix-position="2"]')).toHaveAttribute(
    'data-prefix-status',
    'changed',
  );
  await expect(diagram.locator('table')).toHaveCount(6);
  await expect(diagram.locator('table caption')).toHaveCount(6);
  expect(await diagram.locator('th[scope="col"]').count()).toBeGreaterThan(0);
  expect(await diagram.locator('th[scope="row"]').count()).toBeGreaterThan(0);
  await expectDiagramContainment(page);
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(8);
  await expect(details).toContainText('each with its own denominator for every query row');
  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expect(
    page.locator('nav[data-chapter-navigation] a[data-chapter-direction="previous"]'),
  ).toHaveAttribute('data-chapter-id', '29-rope');
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 30 multi-head causal attention vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 30 while its Russian route remains deferred', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(30);
    expect(english[29]).toEqual(
      expect.objectContaining({ chapterId, order: 30, title: chapterTitle }),
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

  test('the Rust-backed lesson and natural-height diagram render at desktop and narrow widths', async ({
    page,
  }) => {
    const chapters = await readOrderedCourseChapters(page, 'en');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(chapterPath('en', chapterId));
    await expectChapterContent(page, chapters);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectChapterContent(page, chapters);
  });

  test('head identity and causal-state cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
    await expect(diagram.locator('.cue-list li')).toHaveText([
      'Head 0: solid border cue',
      'Head 1: dashed border cue',
      'Allowed key: solid underline',
      'Blocked key: dashed underline',
    ]);
    await expect(diagram.locator('.head-card.head-zero')).toHaveCSS(
      'border-left-style',
      'solid',
    );
    await expect(diagram.locator('.head-card.head-one')).toHaveCSS(
      'border-left-style',
      'dashed',
    );
    await expect(diagram.locator('td.allowed:not(.diagonal)').first()).toHaveCSS(
      'border-bottom-style',
      'solid',
    );
    await expect(diagram.locator('td.blocked').first()).toHaveCSS(
      'border-bottom-style',
      'dashed',
    );
    await expectNoOverflowOrClientScripts(page);
  });

  test('RTL prose keeps matrices, head order, trace values, and formulas left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await expect(diagram.locator('h4').first()).toHaveCSS('direction', 'rtl');
    expect(
      await diagram.locator('table, table caption, table small').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'rtl'),
      ),
    ).toBe(true);
    expect(
      await diagram.locator('.technical, [data-inline-math]').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    const headRows = await diagram
      .locator('[data-head-partition]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-head-partition')));
    expect(headRows).toEqual(['0', '1']);
    await expectNoOverflowOrClientScripts(page);
  });

  test('the lesson and exact multi-head trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('[data-head-partition]')).toHaveCount(2);
    await expect(page.locator('[data-attention-row]')).toHaveCount(6);
    await expect(page.locator('[data-merged-row]')).toHaveCount(3);
    await expect(page.locator('[data-output-map-row]')).toHaveCount(4);
    await expect(page.locator('[data-final-output-row]')).toHaveCount(3);
    await expect(page.locator('[data-prefix-position="0"]')).toContainText('Unchanged');
    await expect(page.locator('[data-prefix-position="2"]')).toContainText('Changed');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
