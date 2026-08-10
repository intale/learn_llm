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
type ChapterLocale = 'en' | 'ru';
const locales = ['en', 'ru'] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Turn query and key pairs with RoPE',
    description:
      'Learn how rotary position embeddings turn query and key feature pairs by absolute position so relative offsets appear in attention dot products, with a tested Rust implementation.',
    headings: [
      'Predict one pair before looking at the table',
      'Rotate adjacent coordinates by absolute position',
      'Keep position, pair, and visibility roles distinct',
      'From recurrent order to rotary score geometry',
      'Precompute once, rotate each query and key row',
      'Read the pair rotations and relative diagonals',
      'Predict, then check the invariant',
      'Hand the position-aware axis to multiple heads',
    ],
    diagramTitle: 'Watch absolute rotations reveal relative query-key positions',
    diagramDescription:
      'Compare two pair frequencies, their rotations, a query-key dot matrix, equal-shift evidence, reverse-mode values, valid shapes, rejected boundaries, and the path to modern decoder LLMs.',
    checked: 'Checked',
    historyFragments: [
      'unmasked self-attention without a position signal',
      'positional encodings to input embeddings',
      'rotations of query and key subspaces',
      'original LLaMA',
    ],
    implementationFragments: [
      'number of position-pair cells fits in usize',
      'It allocates no table storage',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Поворачивайте пары координат запросов и ключей с помощью RoPE',
    description:
      'Разберитесь, как ротационное позиционное кодирование поворачивает пары координат запросов и ключей в зависимости от абсолютной позиции, чтобы в скалярных произведениях внимания учитывалось относительное положение, и реализуйте его на Rust.',
    headings: [
      'Сначала предскажите поворот одной пары',
      'Поворачивайте соседние координаты по абсолютной позиции',
      'Разделяйте роли позиции, пары и видимости',
      'От порядка в рекуррентном состоянии к геометрии RoPE',
      'Вычислите таблицы один раз и поворачивайте каждую строку',
      'Сопоставьте повороты пар с диагоналями матрицы',
      'Сначала предскажите, затем проверьте свойство',
      'Передайте ось с позиционной информацией нескольким головам',
    ],
    diagramTitle:
      'Проследите, как абсолютные повороты выявляют взаимное положение запроса и ключа',
    diagramDescription:
      'Сравните частоты двух пар, их повороты, матрицу скалярных произведений запросов и ключей, проверку одинакового сдвига, величины обратного прохода, допустимые формы, недопустимые граничные случаи и путь к современным декодерным LLM.',
    checked: 'Проверено',
    historyFragments: [
      'самовнимание без маски и позиционного сигнала',
      'позиционные кодирования к входным эмбеддингам',
      'поворотами подпространств запросов и ключей',
      'исходной LLaMA',
    ],
    implementationFragments: [
      'число ячеек «позиция–пара» помещается в usize',
      'Память под таблицы при этом не выделяется',
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
          if (['auto', 'scroll'].includes(overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1) {
            localScroller = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        if ((rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) && !localScroller) {
          issues.push(`${source} escapes the viewport`);
        }
        if (rect.width <= 0 || rect.height <= 0) issues.push(`${source} has no visible box`);
        if (getComputedStyle(element).direction !== 'ltr') issues.push(`${source} is not left-to-right`);
        if (element.classList.contains('katex-display')) {
          const rendered = Array.from(element.querySelectorAll<HTMLElement>('.katex-html *'))
            .map((part) => part.getBoundingClientRect())
            .filter((part) => part.width > 0 && part.height > 0);
          if (rendered.length === 0) issues.push(`${source} has no rendered HTML boxes`);
          else {
            if (Math.min(...rendered.map((part) => part.top)) < rect.top - 1) issues.push(`${source} clips above`);
            if (Math.max(...rendered.map((part) => part.bottom)) > rect.bottom + 1) issues.push(`${source} clips below`);
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
  const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
  const width = await diagram.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 2);

  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(11);
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
    .locator('figure[data-visualization-id="rotary-position-pairs"]')
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
        if (!completeBorder(box)) {
          issues.push(`${box.tagName.toLowerCase()} ${index} lacks a complete border`);
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
          if (parent && (textNode.textContent ?? '').trim() && !parent.closest('.katex-mathml') && (!nestedScroller || nestedScroller === box || !box.contains(nestedScroller))) {
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
          issues.push(`${box.tagName.toLowerCase()} ${index} lets paint cross an inline border`);
        }
        if (painted.some((rect) => rect.top < inner.top - tolerance || rect.bottom > inner.bottom + tolerance)) {
          issues.push(`${box.tagName.toLowerCase()} ${index} lets paint cross a block border`);
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
    order: 29,
    revision: 3,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: locales,
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.description);
  await expectSeoDescription(page, localized.description);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const annotations = await page.locator('.lesson-body annotation[encoding="application/x-tex"]').allTextContents();
  for (const expected of [
    String.raw`\left(\operatorname{RoPE}(x_m)\right)_{2k:2k+2}=R(m\theta_k)(x_m)_{2k:2k+2}`,
    String.raw`R(\phi)=\begin{bmatrix}\cos\phi&-\sin\phi\\\sin\phi&\cos\phi\end{bmatrix}`,
    String.raw`R(\alpha)^\top R(\beta)=R(\beta-\alpha)`,
    String.raw`\begin{bmatrix}\bar{x}_{2k}\\\bar{x}_{2k+1}\end{bmatrix}=R(m\theta_k)^\top`,
    String.raw`\varepsilon_g=4\times10^{-6}`,
    String.raw`10^{-12}`,
  ]) {
    expect(annotations.map(normalizeMath).some((formula) => formula.includes(normalizeMath(expected))), `expected ${expected}`).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  await expectFormulaGeometry(page);

  const lessonText = (await page.locator('.lesson-body').innerText()).replace(/\s+/g, ' ');
  for (const fragment of localized.implementationFragments) {
    expect(lessonText).toContain(fragment);
  }

  const history = page.getByRole('heading', { level: 2, name: localized.headings[3], exact: true }).locator(
    `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.headings[3]}"]]`,
  );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  for (const fragment of localized.historyFragments) expect(historyText.toLocaleLowerCase(locale)).toContain(fragment.toLocaleLowerCase(locale));
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history|trace grammar|build instructions/i);
  await expect(history.locator('a')).toHaveCount(3);

  await expect(page.locator('figure.rust-source')).toHaveCount(5);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'rotary-position-pairs' });
  const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram.locator('.rotation-table tbody tr')).toHaveCount(6);
  await expect(diagram.locator('.dot-table td[data-relative-offset]')).toHaveCount(9);
  await expect(diagram.locator('[data-common-shift="true"]')).toContainText(localized.checked);
  await expect(diagram.locator('[data-norm-preserved="true"]')).toContainText(localized.checked);
  await expect(diagram.locator('[data-shape-case]')).toHaveCount(4);
  await expect(diagram.locator('[data-error-case]')).toHaveCount(6);
  await expect(diagram.locator('[data-rope-proof]')).toContainText(localized.checked);
  await expect(diagram.locator('[data-history-kind]')).toHaveCount(4);
  await expect(diagram.locator('[data-causal-boundary="separate-mask"]')).toHaveCount(1);
  const visibleDiagramText = await diagram.innerText();
  expect(visibleDiagramText).not.toMatch(/RANK3|EMPTY_TOKENS|recurrent-order-in-state|llama-rope-each-layer|separate-mask|site_arithmetic|rust-authored/);
  await expect(diagram.locator('table')).toHaveCount(5);
  await expect(diagram.locator('table caption')).toHaveCount(5);
  await expectDiagramContainment(page, narrow);
  await expectBoundedBoxContainment(page);

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(9);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(page.locator('nav[data-chapter-navigation] a[data-chapter-direction="previous"]')).toHaveAttribute('data-chapter-id', '28-causal-masking');
  await expect(page.locator('nav[data-chapter-navigation] a[data-chapter-direction="next"]')).toHaveAttribute('data-chapter-id', '30-multi-head-attention');
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 29 rotary position embedding vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('English and Russian publish reciprocal Chapter 29 routes', async ({ page }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters[28]).toEqual(expect.objectContaining({ chapterId, order: 29, title: copy[locale].title }));
      await page.goto(chapterPath(locale, chapterId));
      const other: ChapterLocale = locale === 'en' ? 'ru' : 'en';
      await expect(page.locator(`.locale-switch a[data-locale="${other}"]`)).toHaveAttribute('href', chapterPath(other, chapterId));
      await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute('href', new RegExp(`/${other}/course/${chapterId}/$`));
    }
  });

  test('both complete lessons and diagrams render at desktop and narrow widths', async ({ page }) => {
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

  test('full view reuses each localized semantic figure and restores focus', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const names: string[] = [];
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      names.push((await toggle.getAttribute('aria-label')) ?? '');
      const before = await diagram.evaluate((node) => ({
        boxes: node.querySelectorAll('[data-diagram-box]').length,
        scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
        tables: node.querySelectorAll('table').length,
        figures: document.querySelectorAll('figure[data-visualization-id="rotary-position-pairs"]').length,
      }));
      await toggle.click();
      await page.waitForFunction(() => document.fullscreenElement?.getAttribute('data-visualization-id') === 'rotary-position-pairs');
      await settle(page);
      const after = await diagram.evaluate((node) => ({
        boxes: node.querySelectorAll('[data-diagram-box]').length,
        scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
        tables: node.querySelectorAll('table').length,
        figures: document.querySelectorAll('figure[data-visualization-id="rotary-position-pairs"]').length,
        debt: node.scrollWidth - node.clientWidth,
        regionDebt: Math.max(0, ...Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-scroll]')).map((region) => region.scrollWidth - region.clientWidth)),
      }));
      expect({ boxes: after.boxes, scrollers: after.scrollers, tables: after.tables, figures: after.figures }).toEqual(before);
      expect(after.debt).toBeLessThanOrEqual(2);
      expect(after.regionDebt).toBeLessThanOrEqual(320);
      await expectBoundedBoxContainment(page);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
    expect(new Set(names).size).toBe(locales.length);
  });

  test('pair-speed and relative-position cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
      await expect(diagram.locator('.fast-cue')).toHaveCSS('border-top-style', 'solid');
      await expect(diagram.locator('.slow-cue')).toHaveCSS('border-top-style', 'dashed');
      await expect(diagram.locator('.zero-cue')).toHaveCSS('border-top-style', 'double');
      await expect(diagram.locator('.fast-pair th').first()).toHaveCSS('border-top-style', 'solid');
      await expect(diagram.locator('.slow-pair th').first()).toHaveCSS('border-top-style', 'dashed');
      await expect(diagram.locator('.positive-offset').first()).toHaveCSS('border-top-style', 'solid');
      await expect(diagram.locator('.negative-offset').first()).toHaveCSS('border-top-style', 'dashed');
      await expect(diagram.locator('.zero-offset').first()).toHaveCSS('border-top-style', 'double');
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('RTL prose keeps technical axes and formulas left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
      await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
      expect(await diagram.locator('.rotation-table, .dot-table, .compact-matrix, .gradient-table').evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).direction === 'ltr'))).toBe(true);
      expect(await diagram.locator('.rotation-table, .dot-table, .compact-matrix, .gradient-table').locator('caption, th, small').evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).direction === 'rtl'))).toBe(true);
      expect(await diagram.locator('[data-inline-math]').evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).direction === 'ltr'))).toBe(true);
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
      const diagram = page.locator('figure[data-visualization-id="rotary-position-pairs"]');
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await toggle.click();
      await page.waitForFunction(() => document.fullscreenElement?.getAttribute('data-visualization-id') === 'rotary-position-pairs');
      await settle(page);
      await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
      await expect(diagram.locator('.slow-pair th').first()).toHaveCSS('border-top-style', 'dashed');
      await expect(diagram.locator('.zero-offset').first()).toHaveCSS('border-top-style', 'double');
      await expectDiagramContainment(page, false);
      await expectBoundedBoxContainment(page);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

});
