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
type ChapterLocale = 'en' | 'ru';
const locales = ['en', 'ru'] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Create query, key, and value views',
    description:
      'Learn how Transformer self-attention creates query, key, and value tensors from one hidden-state sequence through three independent bias-free projections.',
    headings: [
      'Predict three outputs from one sequence',
      'Project the final feature axis three ways',
      'Keep roles, axes, and dimensions separate',
      'From learned alignment to self-attention projections',
      'Compose three existing differentiable linear layers',
      'Inspect how one sequence becomes three learned representations',
      'Predict before reading the evidence',
      'Compare queries with keys and mix values next',
    ],
    historyFragments: [
      'previous decoder state',
      'two different parts of the encoder-decoder model',
      'one previous-layer sequence',
      'same sequence-to-three-projections pattern',
    ],
    diagramTitle: 'Split one hidden sequence into three learned views',
    diagramDescription:
      'Trace one hidden-state sequence through query, key, and value projections, then compare their shapes, gradients, independence, historical sources, and rejected inputs.',
    rankError: 'The input must keep explicit batch, token, and feature axes.',
    changed: 'Changed',
    unchanged: 'Unchanged',
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Создайте представления запросов, ключей и значений',
    description:
      'Разберите, как самовнимание Transformer создаёт из одной последовательности скрытых состояний тензоры запросов, ключей и значений с помощью трёх независимых проекций без смещения.',
    headings: [
      'Предскажите три результата для одной последовательности',
      'Спроецируйте последнюю ось признаков тремя способами',
      'Различайте роли, оси и размерности',
      'От обучаемого выравнивания к проекциям самовнимания',
      'Составьте слой из трёх существующих дифференцируемых линейных слоёв',
      'Проследите, как одна последовательность превращается в три обучаемых представления',
      'Сначала сделайте предсказания',
      'Далее сопоставьте запросы с ключами и смешайте значения',
    ],
    historyFragments: [
      'предыдущее состояние декодера',
      'двух разных частей модели энкодера–декодера',
      'одна последовательность предыдущего слоя',
      'трёх отдельных проекций',
    ],
    diagramTitle:
      'Получите из одной последовательности скрытых состояний три обучаемых представления',
    diagramDescription:
      'Проследите, как одна последовательность скрытых состояний проходит через проекции запросов, ключей и значений, а затем сравните формы, градиенты, независимость, источники данных в исторических механизмах внимания и отклонённые входы.',
    rankError: 'Во входе должны быть явно представлены оси пакета, токенов и признаков.',
    changed: 'Изменено',
    unchanged: 'Без изменений',
  },
} as const;

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
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
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

  const branchItems = diagram.locator('.branch-grid > li');
  await expect(branchItems).toHaveCount(3);
  expect(
    await branchItems.evaluateAll((items) =>
      items.map((item) => ({
        display: getComputedStyle(item).display,
        role: item.querySelector<HTMLElement>('[data-qkv-role]')?.dataset.qkvRole,
      })),
    ),
  ).toEqual([
    { display: 'grid', role: 'query' },
    { display: 'grid', role: 'key' },
    { display: 'grid', role: 'value' },
  ]);

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

  if (narrow) {
    const branchScroller = diagram.locator('.branches-scroller');
    const branchScrollMetrics = await branchScroller.evaluate((node) => {
      const scroller = node as HTMLElement;
      const originalScrollTop = scroller.scrollTop;
      scroller.scrollTop = scroller.scrollHeight;
      const maxScrollTop = scroller.scrollTop;
      scroller.scrollTop = originalScrollTop;
      return {
        ariaLabel: scroller.getAttribute('aria-label'),
        clientHeight: scroller.clientHeight,
        clientWidth: scroller.clientWidth,
        maxScrollTop,
        overflowX: getComputedStyle(scroller).overflowX,
        role: scroller.getAttribute('role'),
        scrollHeight: scroller.scrollHeight,
        scrollWidth: scroller.scrollWidth,
        tabIndex: scroller.tabIndex,
      };
    });
    expect(branchScrollMetrics.role).toBe('region');
    expect(branchScrollMetrics.ariaLabel).toBeTruthy();
    expect(branchScrollMetrics.tabIndex).toBe(0);
    expect(['auto', 'scroll']).toContain(branchScrollMetrics.overflowX);
    expect(branchScrollMetrics.scrollWidth).toBeGreaterThan(branchScrollMetrics.clientWidth);
    expect(branchScrollMetrics.scrollHeight).toBe(branchScrollMetrics.clientHeight);
    expect(branchScrollMetrics.maxScrollTop).toBe(0);
  }

  for (const scroller of await scrollers.all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }

}

async function expectBoundedBoxContainment(page: Page) {
  const problems = await page
    .locator('figure[data-visualization-id="qkv-projections"]')
    .evaluate((root) => {
      const issues: string[] = [];
      const allowedError = 2;
      const describe = (node: HTMLElement, index: number) =>
        `${node.tagName.toLowerCase()}${
          node.className
            ? `.${String(node.className).split(/\s+/).slice(0, 2).join('.')}`
            : ''
        } ${index}`;
      const hasCompleteBorder = (node: HTMLElement) => {
        const style = getComputedStyle(node);
        const widths = [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ].map(Number.parseFloat);
        const styles = [
          style.borderTopStyle,
          style.borderRightStyle,
          style.borderBottomStyle,
          style.borderLeftStyle,
        ];
        return (
          widths.every((width) => width > 0) &&
          styles.every((value) => !['none', 'hidden'].includes(value))
        );
      };
      const all = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((node) => {
        const style = getComputedStyle(node);
        return (
          node.getClientRects().length > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      });
      for (const [index, node] of all.entries()) {
        if (node.closest('[data-diagram-full-view-controls]') || node.closest('.katex')) continue;
        const style = getComputedStyle(node);
        if (
          ['hidden', 'clip'].includes(style.overflowX) ||
          ['hidden', 'clip'].includes(style.overflowY)
        ) {
          issues.push(`${describe(node, index)} conceals overflow`);
        }
        if (
          hasCompleteBorder(node) &&
          !node.hasAttribute('data-diagram-box') &&
          !['TH', 'TD'].includes(node.tagName) &&
          node !== root
        ) {
          issues.push(`${describe(node, index)} has an unmarked complete border`);
        }
      }
      const boxes = all.filter(
        (node) =>
          !node.closest('[data-diagram-full-view-controls]') &&
          (node.hasAttribute('data-diagram-box') || ['TH', 'TD'].includes(node.tagName)),
      );
      const paintedRects = (box: HTMLElement) => {
        const rects: DOMRect[] = [];
        const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        let current = walker.nextNode();
        while (current) {
          const parent = current.parentElement;
          const text = current.textContent ?? '';
          if (parent && text.trim() && !parent.closest('.katex-mathml')) {
            const nestedScroller = parent.closest<HTMLElement>('[data-diagram-scroll]');
            const style = getComputedStyle(parent);
            if (
              (!nestedScroller || nestedScroller === box || !box.contains(nestedScroller)) &&
              style.display !== 'none' &&
              style.visibility !== 'hidden'
            ) {
              const range = document.createRange();
              range.selectNodeContents(current);
              rects.push(...Array.from(range.getClientRects()));
            }
          }
          current = walker.nextNode();
        }
        for (const element of box.querySelectorAll<HTMLElement>(
          '.katex, [data-diagram-box], th, td',
        )) {
          const nestedScroller = element.closest<HTMLElement>('[data-diagram-scroll]');
          const style = getComputedStyle(element);
          if (
            (!nestedScroller || nestedScroller === box || !box.contains(nestedScroller)) &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          ) {
            rects.push(element.getBoundingClientRect());
          }
        }
        return rects;
      };
      for (const [index, box] of boxes.entries()) {
        if (!hasCompleteBorder(box)) issues.push(`${describe(box, index)} lacks a complete border`);
        const style = getComputedStyle(box);
        const bounds = box.getBoundingClientRect();
        const innerLeft = bounds.left + Number.parseFloat(style.borderLeftWidth);
        const innerRight = bounds.right - Number.parseFloat(style.borderRightWidth);
        const innerTop = bounds.top + Number.parseFloat(style.borderTopWidth);
        const innerBottom = bounds.bottom - Number.parseFloat(style.borderBottomWidth);
        const painted = paintedRects(box);
        const paintedHorizontalOverflow = painted.some(
          (rect) => rect.left < innerLeft - allowedError || rect.right > innerRight + allowedError,
        );
        const paintedVerticalOverflow = painted.some(
          (rect) => rect.top < innerTop - allowedError || rect.bottom > innerBottom + allowedError,
        );
        if (box.scrollWidth > box.clientWidth + allowedError && paintedHorizontalOverflow) {
          issues.push(
            `${describe(box, index)} has ${box.scrollWidth - box.clientWidth}px horizontal content debt`,
          );
        }
        if (box.scrollHeight > box.clientHeight + allowedError && paintedVerticalOverflow) {
          issues.push(
            `${describe(box, index)} has ${box.scrollHeight - box.clientHeight}px vertical content debt`,
          );
        }
      }
      return issues;
    });
  expect(problems).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 26,
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
    String.raw`Q=XW_Q,\quad K=XW_K,\quad V=XW_V`,
    String.raw`W_Q,W_K,W_V\in\mathbb{R}^{d_{model}\times d_{head}}`,
    String.raw`Q,K,V\in\mathbb{R}^{B\times T\times d_{head}}`,
    String.raw`L=\langle Q,U_Q\rangle+\langle K,U_K\rangle+\langle V,U_V\rangle`,
    String.raw`\bar X=\bar QW_Q^{\mathsf T}+\bar KW_K^{\mathsf T}+\bar VW_V^{\mathsf T}`,
    String.raw`\bar W_Q=X_{(BT)}^{\mathsf T}\bar Q_{(BT)}`,
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
      name: localized.headings[3],
      exact: true,
    })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.headings[3]}"]]`,
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  for (const fragment of localized.historyFragments) expect(historyText).toContain(fragment);
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(2);

  await expect(page.locator('figure.rust-source')).toHaveCount(5);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'qkv-projections' });
  const diagram = page.locator('figure[data-visualization-id="qkv-projections"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
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
  await expect(diagram.locator('.independence-card')).toContainText(localized.changed);
  await expect(diagram.locator('.independence-card')).toContainText(localized.unchanged);
  await expect(diagram.locator('.empty-card')).toContainText('[0,2,3]');
  await expect(diagram.locator('.empty-card')).toContainText('[2,0,3]');
  await expect(diagram.locator('.errors-card li')).toHaveCount(3);
  await expect(diagram.locator('.errors-card')).toContainText(localized.rankError);
  if (locale === 'ru') {
    await expect(diagram.locator('.errors-card')).not.toContainText('must have rank three');
  }
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
  await expectBoundedBoxContainment(page);
  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(9);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 26 Q/K/V projections vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English and Russian publish reciprocal Chapter 26 routes', async ({ page }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.find((chapter) => chapter.chapterId === chapterId)).toEqual(
        expect.objectContaining({ chapterId, order: 26, title: copy[locale].title }),
      );
      await page.goto(chapterPath(locale, chapterId));
      const other: ChapterLocale = locale === 'en' ? 'ru' : 'en';
      await expect(page.locator(`.locale-switch a[data-locale="${other}"]`)).toHaveAttribute(
        'href',
        chapterPath(other, chapterId),
      );
      await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveCount(1);
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
    }
  });

  test('both projection lessons and natural-height diagrams render at desktop and narrow widths', async ({
    page,
  }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, chapters, false, locale);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, chapters, true, locale);
    }
  });

  test('English and Russian render the same mathematical annotations', async ({ page }) => {
    const formulas = new Map<ChapterLocale, string[]>();
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      formulas.set(
        locale,
        (await page
          .locator('.lesson-body annotation[encoding="application/x-tex"]')
          .allTextContents()).map(normalizeMath),
      );
    }
    expect(formulas.get('ru')).toEqual(formulas.get('en'));
  });

  test('solid, dashed, and double projection cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
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
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('RTL prose keeps formulas and technical values left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
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
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('both lessons and their projection evidence render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      await expect(page.getByRole('heading', { level: 1, name: copy[locale].title })).toBeVisible();
      await expect(page.locator('[data-qkv-role="query"]')).toContainText('2.000000');
      await expect(page.locator('[data-qkv-role="value"]')).toContainText('-3.000000');
      await expect(page.locator('.errors-card li')).toHaveCount(3);
      await expect(page.locator('.errors-card')).toContainText(copy[locale].rankError);
      await expect(page.locator('.proof-card')).toContainText('gradcheck=true');
      await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
