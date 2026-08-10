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
type ChapterLocale = 'en' | 'ru';
const locales = ['en', 'ru'] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Run causal attention in several heads, then mix',
    description:
      'Learn how full-width query, key, and value projections become separate rotary causal attention heads before concatenation and one learned output projection.',
    headings: [
      'Predict the boundaries before calculating probabilities',
      'Project into head views before scoring',
      'Keep the model, head, and token axes distinct',
      'From one recurrent alignment to parallel projected attention',
      'Keep the complete Rust path differentiable and inspectable',
      'See exactly where separate heads become one model-width row',
      'Test shape, visibility, and mixing—not a story about head roles',
      'Put this transformation on a pre-normalized residual path',
    ],
    diagramTitle: 'Keep two causal attention lanes separate until the output projection',
    diagramDescription:
      'Follow projected features through the head split, RoPE, two causal probability tables, value mixtures, concatenation, and the output projection.',
    unchanged: 'Unchanged',
    changed: 'Changed',
    checked: 'Checked',
    denominator: 'each with its own denominator for every query row',
    historyFragments: [
      'one alignment distribution and context at a time',
      'project queries, keys, and values several times',
      'not a specialization guarantee',
      'optimized causal multi-head attention implementation',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Вычислите каузальное внимание в нескольких головах, затем смешайте их выходы',
    description:
      'Разберитесь, как полноразмерные проекции запросов, ключей и значений разделяются на головы, в каждой из которых независимо применяются RoPE и каузальное внимание, а затем выходы конкатенируются и проходят через обучаемую выходную проекцию.',
    headings: [
      'Сначала определите границы этапов, затем вычисляйте вероятности',
      'Сначала спроецируйте признаки, затем разделите их на головы и вычислите оценки',
      'Не путайте оси модели, голов и токенов',
      'От одного рекуррентного выравнивания к параллельным проекциям внимания',
      'Соберите на Rust полностью дифференцируемый и проверяемый путь вычислений',
      'Проследите, где отдельные головы объединяются в строку ширины модели',
      'Проверяйте формы, видимость и смешивание, а не приписывайте головам роли',
      'Поместите преобразование в остаточную ветвь с предварительной нормализацией',
    ],
    diagramTitle: 'Две головы внимания остаются раздельными до выходной проекции',
    diagramDescription:
      'Проследите путь спроецированных признаков через разделение на головы, RoPE, две каузальные таблицы вероятностей, смеси значений, конкатенацию и выходную проекцию.',
    unchanged: 'Без изменений',
    changed: 'Изменилось',
    checked: 'Подтверждено расчётом',
    denominator: 'каждая со своим знаменателем для каждой строки запроса',
    historyFragments: [
      'за один шаг строит одно распределение выравнивания и один контекстный вектор',
      'несколько раз проецируют запросы, ключи и значения',
      'возможность, а не гарантия специализации',
      'оптимизированной реализацией каузального многоголового внимания',
    ],
  },
} as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, '');

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

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

async function expectDiagramContainment(page: Page, narrow: boolean) {
  const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
  const width = await diagram.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 2);
  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(9);
  const audit = await scrollers.evaluateAll((nodes) =>
    nodes.map((node, index) => {
      const scroller = node as HTMLElement;
      const style = getComputedStyle(scroller);
      const issues: string[] = [];
      if (!['auto', 'scroll'].includes(style.overflowX)) issues.push(`scroller ${index} lacks horizontal ownership`);
      if (
        scroller.getAttribute('role') !== 'region' ||
        scroller.getAttribute('tabindex') !== '0' ||
        !(scroller.getAttribute('aria-label') || scroller.getAttribute('aria-labelledby'))
      ) issues.push(`scroller ${index} is not a named keyboard region`);
      if (scroller.scrollHeight > scroller.clientHeight + 2) issues.push(`scroller ${index} clips vertically`);
      return { debt: scroller.scrollWidth - scroller.clientWidth, issues };
    }),
  );
  expect(audit.flatMap(({ issues }) => issues)).toEqual([]);
  if (narrow) expect(audit.some(({ debt }) => debt > 2)).toBe(true);
  for (const scroller of await scrollers.all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
}

async function expectBoundedBoxContainment(page: Page) {
  const problems = await page
    .locator('figure[data-visualization-id="multi-head-attention-flow"]')
    .evaluate((root) => {
      const issues: string[] = [];
      const tolerance = 2;
      const visible = (node: HTMLElement) => {
        const style = getComputedStyle(node);
        return node.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const completeBorder = (node: HTMLElement) => {
        const style = getComputedStyle(node);
        return [
          [style.borderTopWidth, style.borderTopStyle],
          [style.borderRightWidth, style.borderRightStyle],
          [style.borderBottomWidth, style.borderBottomStyle],
          [style.borderLeftWidth, style.borderLeftStyle],
        ].every(([width, borderStyle]) => Number.parseFloat(width) > 0 && !['none', 'hidden'].includes(borderStyle));
      };
      const all = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(visible);
      for (const [index, node] of all.entries()) {
        if (node.closest('[data-diagram-full-view-controls]') || node.closest('.katex')) continue;
        const style = getComputedStyle(node);
        if (['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY)) {
          issues.push(`element ${index} conceals overflow`);
        }
        if (completeBorder(node) && !node.hasAttribute('data-diagram-box') && !['TH', 'TD'].includes(node.tagName)) {
          issues.push(`bordered element ${index} lacks data-diagram-box`);
        }
      }
      const boxes = all.filter((node) => node.hasAttribute('data-diagram-box') || ['TH', 'TD'].includes(node.tagName));
      for (const [index, box] of boxes.entries()) {
        const identity = box.getAttribute('data-head-output') ?? box.getAttribute('data-visibility') ?? box.textContent?.trim().slice(0, 40) ?? '';
        const label = `${box.tagName.toLowerCase()} ${index}${identity ? ` (${identity})` : ''}`;
        if (!completeBorder(box)) {
          issues.push(`${label} lacks a complete border`);
          continue;
        }
        const style = getComputedStyle(box);
        const bounds = box.getBoundingClientRect();
        const inner = {
          left: bounds.left + Number.parseFloat(style.borderLeftWidth),
          right: bounds.right - Number.parseFloat(style.borderRightWidth),
          top: bounds.top + Number.parseFloat(style.borderTopWidth),
          bottom: bounds.bottom - Number.parseFloat(style.borderBottomWidth),
        };
        const painted: DOMRect[] = [];
        const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        let textNode = walker.nextNode();
        while (textNode) {
          const parent = textNode.parentElement;
          const nestedScroller = parent?.closest<HTMLElement>('[data-diagram-scroll]');
          if (
            parent &&
            (textNode.textContent ?? '').trim() &&
            !parent.closest('.katex-mathml') &&
            (!nestedScroller || nestedScroller === box || !box.contains(nestedScroller))
          ) {
            const range = document.createRange();
            range.selectNodeContents(textNode);
            painted.push(...Array.from(range.getClientRects()));
          }
          textNode = walker.nextNode();
        }
        for (const formula of box.querySelectorAll<HTMLElement>('.katex')) {
          const nestedScroller = formula.closest<HTMLElement>('[data-diagram-scroll]');
          if (!nestedScroller || nestedScroller === box || !box.contains(nestedScroller)) painted.push(formula.getBoundingClientRect());
        }
        if (painted.some((rect) => rect.left < inner.left - tolerance || rect.right > inner.right + tolerance)) {
          issues.push(`${label} lets paint cross an inline border`);
        }
        if (painted.some((rect) => rect.top < inner.top - tolerance || rect.bottom > inner.bottom + tolerance)) {
          issues.push(`${label} lets paint cross a block border`);
        }
      }
      return issues;
    });
  expect(problems).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  locale: ChapterLocale,
  narrow: boolean,
) {
  const localized = copy[locale];
  await settle(page);
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 30,
    revision: 2,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: locales,
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.description);
  await expectSeoDescription(page, localized.description);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [
    String.raw`d_h=\frac{d_{\mathrm{model}}}{h}=2`,
    String.raw`[B,T,d_{\mathrm{model}}]\to[B,h,T,d_h]`,
    String.raw`A_i=\operatorname{softmax}_{j}`,
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
  for (const fragment of localized.historyFragments) {
    expect(lessonText.toLocaleLowerCase(locale)).toContain(fragment.toLocaleLowerCase(locale));
  }
  expect(lessonText).not.toMatch(/TypeScript|static HTML|JavaScript|trace grammar|Rust-authored|Rust provenance/i);
  await expect(page.locator('.lesson-body a[href^="https://arxiv.org/abs/"]')).toHaveCount(3);
  await expect(page.locator('figure.rust-source')).toHaveCount(7);
  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'multi-head-attention-flow',
  });

  const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
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
  await expect(diagram.locator('[data-proof-check]')).toHaveCount(6);
  await expect(diagram.locator('[data-prefix-position="0"]')).toContainText(localized.checked);
  const visibleDiagramText = await diagram.innerText();
  expect(visibleDiagramText).not.toMatch(/head-output|output-weight|site_arithmetic|rust-authored/);
  const regionNames = await diagram.locator('[data-diagram-scroll]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('aria-label')),
  );
  expect(regionNames.every((name) => Boolean(name))).toBe(true);
  expect(new Set(regionNames).size).toBe(regionNames.length);
  await expect(diagram.locator('table')).toHaveCount(6);
  await expect(diagram.locator('table caption')).toHaveCount(6);
  expect(await diagram.locator('th[scope="col"]').count()).toBeGreaterThan(0);
  expect(await diagram.locator('th[scope="row"]').count()).toBeGreaterThan(0);
  await expectDiagramContainment(page, narrow);
  await expectBoundedBoxContainment(page);
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(8);
  await expect(details).toContainText(localized.denominator);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator('nav[data-chapter-navigation] a[data-chapter-direction="previous"]'),
  ).toHaveAttribute('data-chapter-id', '29-rope');
  await expect(page.locator('nav[data-chapter-navigation] a[data-chapter-direction="next"]')).toHaveAttribute('data-chapter-id', '31-decoder-block');
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 30 multi-head causal attention vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English and Russian publish reciprocal Chapter 30 routes', async ({ page }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters[29]).toEqual(
        expect.objectContaining({ chapterId, order: 30, title: copy[locale].title }),
      );
      await page.goto(chapterPath(locale, chapterId));
      const other: ChapterLocale = locale === 'en' ? 'ru' : 'en';
      await expect(page.locator(`.locale-switch a[data-locale="${other}"]`)).toHaveAttribute(
        'href',
        chapterPath(other, chapterId),
      );
      await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute(
        'href',
        new RegExp(`/${other}/course/${chapterId}/$`),
      );
    }
  });

  test('both complete lessons and diagrams render at desktop and narrow widths', async ({
    page,
  }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, chapters, locale, false);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, chapters, locale, true);
    }
  });

  test('full view reuses the localized semantic figure and restores focus', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const names: string[] = [];
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      names.push((await toggle.getAttribute('aria-label')) ?? '');
      const before = await diagram.evaluate((node) => ({
        boxes: node.querySelectorAll('[data-diagram-box]').length,
        scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
        tables: node.querySelectorAll('table').length,
        figures: document.querySelectorAll('figure[data-visualization-id="multi-head-attention-flow"]').length,
      }));
      await toggle.click();
      await page.waitForFunction(() => document.fullscreenElement?.getAttribute('data-visualization-id') === 'multi-head-attention-flow');
      await settle(page);
      const after = await diagram.evaluate((node) => ({
        boxes: node.querySelectorAll('[data-diagram-box]').length,
        scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
        tables: node.querySelectorAll('table').length,
        figures: document.querySelectorAll('figure[data-visualization-id="multi-head-attention-flow"]').length,
        debt: node.scrollWidth - node.clientWidth,
        verticalViewports: node.scrollHeight / node.clientHeight,
        regionDebt: Math.max(0, ...Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-scroll]')).map((region) => region.scrollWidth - region.clientWidth)),
      }));
      expect({ boxes: after.boxes, scrollers: after.scrollers, tables: after.tables, figures: after.figures }).toEqual(before);
      expect(after.debt).toBeLessThanOrEqual(2);
      expect(after.regionDebt).toBeLessThanOrEqual(320);
      expect(after.verticalViewports).toBeLessThanOrEqual(2.75);
      await expectBoundedBoxContainment(page);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
    expect(new Set(names).size).toBe(locales.length);
  });

  test('head identity and causal-state cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
      await expect(diagram.locator('.cue-list li')).toHaveCount(5);
      await expect(diagram.locator('.head-card.head-zero')).toHaveCSS('border-top-style', 'solid');
      await expect(diagram.locator('.head-card.head-one')).toHaveCSS('border-top-style', 'dashed');
      await expect(diagram.locator('td.allowed:not(.diagonal)').first()).toHaveCSS('border-bottom-style', 'solid');
      await expect(diagram.locator('td.blocked').first()).toHaveCSS('border-bottom-style', 'dashed');
      await expect(diagram.locator('td.diagonal').first()).toHaveCSS('border-top-style', 'double');
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('RTL prose keeps matrices, head order, trace values, and formulas left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
      await expect(diagram.locator('h4').first()).toHaveCSS('direction', 'rtl');
      expect(await diagram.locator('.evidence-table').evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).direction === 'ltr'))).toBe(true);
      expect(await diagram.locator('table caption, table th, table small').evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).direction === 'rtl'))).toBe(true);
      expect(await diagram.locator('.technical, [data-inline-math]').evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).direction === 'ltr'))).toBe(true);
      const headRows = await diagram.locator('[data-head-partition]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-head-partition')));
      expect(headRows).toEqual(['0', '1']);
      await expectDiagramContainment(page, true);
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('full view remains contained with forced colors and synthetic RTL', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="multi-head-attention-flow"]');
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await toggle.click();
      await page.waitForFunction(() => document.fullscreenElement?.getAttribute('data-visualization-id') === 'multi-head-attention-flow');
      await settle(page);
      await expect(diagram.locator('.head-card.head-one')).toHaveCSS('border-top-style', 'dashed');
      await expect(diagram.locator('td.diagonal').first()).toHaveCSS('border-top-style', 'double');
      await expectDiagramContainment(page, false);
      await expectBoundedBoxContainment(page);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

});
