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
type ChapterLocale = 'en' | 'ru';
const locales = ['en', 'ru'] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Compute one unmasked self-attention head',
    description:
      'Learn how one unmasked Transformer self-attention head scores queries against keys, normalizes each row, and mixes values with inspectable Rust evidence.',
    headings: [
      'Predict which value each query will retrieve',
      'Score, scale, normalize, and mix',
      'Keep query rows and key columns separate',
      'From recurrent context to all-position retrieval',
      'Compose the head from differentiable tensor operations',
      'Trace every attention row from scores to output',
      'Predict before reading the evidence',
      'Mask future keys next',
    ],
    historyFragments: [
      'fixed-size vector',
      'previous decoder state',
      'simultaneous queries in a matrix',
      'does not make autoregressive token generation parallel',
    ],
    diagramTitle: 'Follow every score into a weighted value mixture',
    diagramDescription:
      'Follow exact query, key, value, score, probability, mixture, gradient, shape, history, and rejected-boundary evidence through one unmasked attention head.',
    rankError: 'The query input must expose batch, token, and feature axes.',
    rejected: 'Rejected',
    verified: 'Verified',
    unmasked: 'Every key position is visible',
    historyDiagramFragments: [
      'One fixed-size source vector is reused across the recurrent decoder steps.',
      'Each decoder step retrieves a new weighted context from encoder annotations.',
      'One layer forms a score for every query-key position pair in the available sequence.',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Вычислите одну голову самовнимания без маски',
    description:
      'Разберите, как одна голова самовнимания Transformer без маски сопоставляет запросы с ключами, нормирует каждую строку и смешивает значения на основе проверяемого примера на Rust.',
    headings: [
      'Предскажите, какое значение учтёт каждый запрос',
      'Вычислите оценки, масштабируйте, нормируйте и смешайте значения',
      'Не смешивайте строки запросов со столбцами ключей',
      'От рекуррентного контекста к учёту всех доступных позиций',
      'Соберите голову из дифференцируемых операций над тензорами',
      'Проследите путь каждой строки внимания от оценок до выхода',
      'Сначала сделайте предсказания',
      'Далее скройте будущие ключи',
    ],
    historyFragments: [
      'вектор фиксированного размера',
      'предыдущего состояния декодера',
      'одновременно обрабатываемые запросы в матрицу',
      'не распараллеливает авторегрессионную генерацию токенов',
    ],
    diagramTitle: 'Проследите путь каждой оценки до взвешенной смеси значений',
    diagramDescription:
      'Проследите точные запросы, ключи, значения, оценки, вероятности, смеси, градиенты, формы, исторические этапы и отклонённые недопустимые входы одной головы внимания без маски.',
    rankError:
      'Во входе запросов должны быть явно заданы оси пакета, токенов и признаков.',
    rejected: 'Отклонено',
    verified: 'Проверено',
    unmasked: 'Видны все позиции ключей',
    historyDiagramFragments: [
      'Один вектор исходной последовательности фиксированного размера повторно используется на всех рекуррентных шагах декодера.',
      'На каждом шаге декодер получает новый взвешенный контекст из аннотаций энкодера.',
      'Один слой формирует оценку для каждой пары позиций запроса и ключа в доступной последовательности.',
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
            '.input-card, .score-card, .probability-card, .mixture-card, .evidence-card, .history-card, .error-case, td, th, p, li',
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

async function expectDiagramContainment(
  page: Page,
  options: { narrow: boolean; focusRegions?: boolean },
) {
  const diagram = page.locator('figure[data-visualization-id="self-attention"]');
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-card]')).map(
      (card, index) => ({
        label:
          card.getAttribute('data-input-role') ??
          card.getAttribute('data-score-kind') ??
          card.getAttribute('data-probability-row') ??
          card.getAttribute('data-mixture-row') ??
          card.getAttribute('data-evidence-kind') ??
          card.getAttribute('data-history-kind') ??
          card.getAttribute('data-state') ??
          String(index),
        clientHeight: card.clientHeight,
        scrollHeight: card.scrollHeight,
        clientWidth: card.clientWidth,
        scrollWidth: card.scrollWidth,
      }),
    ),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  for (const card of result.cards) {
    expect(card.scrollWidth, `${card.label} card horizontal containment`).toBeLessThanOrEqual(
      card.clientWidth + 2,
    );
  }

  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(6);
  const scrollerAudit = await scrollers.evaluateAll((nodes) =>
    nodes.map((node, index) => {
      const scroller = node as HTMLElement;
      const style = getComputedStyle(scroller);
      const issues: string[] = [];
      const bounds = scroller.getBoundingClientRect();
      const paintedVerticalOverflow = Array.from(scroller.children).some((child) => {
        const rect = child.getBoundingClientRect();
        return rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2;
      });
      if (!['auto', 'scroll'].includes(style.overflowX)) {
        issues.push(`scroller ${index} does not own horizontal overflow`);
      }
      if (
        scroller.getAttribute('role') !== 'region' ||
        scroller.getAttribute('tabindex') !== '0' ||
        !scroller.getAttribute('aria-label')
      ) {
        issues.push(`scroller ${index} is not a named keyboard-reachable region`);
      }
      if (scroller.scrollHeight > scroller.clientHeight + 2 && paintedVerticalOverflow) {
        issues.push(`scroller ${index} clips vertically`);
      }
      return {
        debt: scroller.scrollWidth - scroller.clientWidth,
        issues,
      };
    }),
  );
  expect(scrollerAudit.flatMap(({ issues }) => issues)).toEqual([]);
  if (options.narrow) {
    expect(scrollerAudit.some(({ debt }) => debt > 2)).toBe(true);
  }

  if (options.focusRegions) {
    for (const scroller of await scrollers.all()) {
      await scroller.focus();
      await expect(scroller).toBeFocused();
    }
  }
}

async function expectBoundedBoxContainment(page: Page) {
  const problems = await page
    .locator('figure[data-visualization-id="self-attention"]')
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
        if (paintedHorizontalOverflow) {
          issues.push(`${describe(box, index)} lets painted content cross its inline border`);
        }
        if (paintedVerticalOverflow) {
          issues.push(`${describe(box, index)} lets painted content cross its block border`);
        }
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
  await settle(page);
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 27,
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
    String.raw`A=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right),\quad O=AV`,
    String.raw`QK^\top=\begin{bmatrix}0&6\\6&-4\end{bmatrix}`,
    String.raw`\sum_j A_{ij}=1`,
    String.raw`A_{bij}=\frac{\exp(S_{bij})}{\sum_{r=0}^{T-1}\exp(S_{bir})}`,
    String.raw`p_{\mathrm{scaled}}`,
    String.raw`0.669762`,
    String.raw`\bar X=\frac{\partial L}{\partial X}`,
    String.raw`L=\langle O,\bar O\rangle=O_{00}+O_{11}\approx-1.966576`,
    String.raw`\bar S_{bij}`,
    String.raw`A_{bij}\left(\bar A_{bij}-\sum_r A_{bir}\bar A_{bir}\right)`,
    String.raw`\bar Q_b=\frac{\bar S_bK_b}{\sqrt{d_k}}`,
    String.raw`0.079000&-0.039500\\`,
    String.raw`-0.014389&0.007195`,
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
  await expectVisualizationDecision(page, { decision: 'useful', id: 'self-attention' });
  const diagram = page.locator('figure[data-visualization-id="self-attention"]');
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
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
  await expect(diagram.locator('.single-card')).toContainText('[5.000000,-2.000000]');
  await expect(diagram.locator('.boundary-card')).toContainText(localized.unmasked);

  const errorCases = diagram.locator('.errors-card .error-case');
  await expect(errorCases).toHaveCount(5);
  await expect(diagram.locator('.errors-card .error-case[data-state="rejected"]')).toHaveCount(5);
  await expect(errorCases.locator('.state-symbol')).toHaveText(
    Array.from({ length: 5 }, () => localized.rejected),
  );
  await expect(diagram.locator('.errors-card')).toContainText(localized.rankError);
  await expect(diagram.locator('.errors-card')).not.toContainText(localized.verified);
  if (locale === 'ru') {
    await expect(diagram.locator('.errors-card')).not.toContainText(
      'The query input must expose batch, token, and feature axes.',
    );
  }
  await expect(diagram.locator('.proof-card')).toContainText('gradcheck=true');
  await expect(diagram.locator('.proof-card')).toContainText('replay=bitwise');

  await expect(diagram.locator('[data-history-kind]')).toHaveCount(3);
  await expect(diagram.locator('[data-history-kind="earlier"]')).toHaveAttribute(
    'data-history-evidence',
    'recurrent-fixed-context',
  );
  await expect(diagram.locator('[data-history-kind="bridge"]')).toHaveAttribute(
    'data-history-evidence',
    'additive-encoder-decoder-alignment',
  );
  await expect(diagram.locator('[data-history-kind="transformer"]')).toHaveAttribute(
    'data-history-evidence',
    'scaled-dot-product-self-attention|all-sequence-positions',
  );
  const diagramHistory = diagram.locator('.history-section');
  for (const fragment of localized.historyDiagramFragments) {
    await expect(diagramHistory).toContainText(fragment);
  }
  await expect(diagramHistory).not.toContainText('recurrent-fixed-context');
  await expect(diagramHistory).not.toContainText('all-sequence-positions');

  const positions = await diagram.locator('[data-input-role]').evaluateAll((cards) =>
    cards.map((card) => {
      const rectangle = card.getBoundingClientRect();
      return { left: rectangle.left, right: rectangle.right, top: rectangle.top };
    }),
  );
  expect(positions[0].right).toBeLessThan(positions[1].left);
  expect(positions[1].right).toBeLessThan(positions[2].left);
  expect(Math.abs(positions[0].top - positions[1].top)).toBeLessThan(1);

  await expectDiagramContainment(page, { narrow, focusRegions: true });
  await expectBoundedBoxContainment(page);
  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(9);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 27 localized self-attention vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English and Russian publish reciprocal Chapter 27 routes', async ({ page }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.find((chapter) => chapter.chapterId === chapterId)).toEqual(
        expect.objectContaining({ chapterId, order: 27, title: copy[locale].title }),
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

  test('both lessons and diagrams render at desktop and narrow widths', async ({ page }) => {
    test.setTimeout(120_000);
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

  test('full view reuses the localized semantic figure and restores focus', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    const controlNames: string[] = [];
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      await settle(page);
      const diagram = page.locator('figure[data-visualization-id="self-attention"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(1);
      await expect(toggle).toBeVisible();
      const controlName = (await toggle.getAttribute('aria-label'))?.trim() ?? '';
      expect(controlName).not.toBe('');
      controlNames.push(controlName);
      const figureId = await diagram.getAttribute('id');
      expect(figureId).toBeTruthy();
      await expect(toggle).toHaveAttribute('aria-controls', figureId!);

      const before = await diagram.evaluate((node) => ({
        boxes: node.querySelectorAll('[data-diagram-box]').length,
        cards: node.querySelectorAll('[data-diagram-card]').length,
        scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
        formulas: node.querySelectorAll('.katex').length,
        tables: node.querySelectorAll('table').length,
        figures: document.querySelectorAll('figure[data-visualization-id="self-attention"]').length,
        minFont: Math.min(
          ...Array.from(node.querySelectorAll<HTMLElement>('h3, h4, h5, h6, p, dt, dd, li, code'))
            .filter((element) => element.getClientRects().length > 0)
            .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
        ),
      }));

      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'self-attention',
      );
      await settle(page);
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const after = await diagram.evaluate((node) => ({
        boxes: node.querySelectorAll('[data-diagram-box]').length,
        cards: node.querySelectorAll('[data-diagram-card]').length,
        scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
        formulas: node.querySelectorAll('.katex').length,
        tables: node.querySelectorAll('table').length,
        figures: document.querySelectorAll('figure[data-visualization-id="self-attention"]').length,
        inlineDebt: node.scrollWidth - node.clientWidth,
        maximumRegionDebt: Math.max(
          0,
          ...Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-scroll]')).map(
            (region) => region.scrollWidth - region.clientWidth,
          ),
        ),
        minFont: Math.min(
          ...Array.from(node.querySelectorAll<HTMLElement>('h3, h4, h5, h6, p, dt, dd, li, code'))
            .filter((element) => element.getClientRects().length > 0)
            .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
        ),
      }));
      expect({
        boxes: after.boxes,
        cards: after.cards,
        scrollers: after.scrollers,
        formulas: after.formulas,
        tables: after.tables,
        figures: after.figures,
      }).toEqual({
        boxes: before.boxes,
        cards: before.cards,
        scrollers: before.scrollers,
        formulas: before.formulas,
        tables: before.tables,
        figures: before.figures,
      });
      expect(after.figures).toBe(1);
      expect(after.inlineDebt).toBeLessThanOrEqual(2);
      expect(after.maximumRegionDebt).toBeLessThanOrEqual(320);
      expect(after.minFont).toBeGreaterThanOrEqual(11.9);
      expect(after.minFont).toBeGreaterThanOrEqual(before.minFont - 0.1);
      await expectDiagramContainment(page, { narrow: false });
      await expectBoundedBoxContainment(page);

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toBeFocused();
    }
    expect(new Set(controlNames).size).toBe(locales.length);
  });

  test('structural attention cues and rejected states survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
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
      await expect(diagram.locator('.score-cue')).toHaveCSS('border-top-style', 'dotted');
      await expect(diagram.locator('.probability-cue')).toHaveCSS(
        'border-top-style',
        'double',
      );
      await expect(diagram.locator('.error-case[data-state="rejected"]')).toHaveCount(5);
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('RTL prose keeps formulas, tables, and technical values left-to-right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
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
      expect(
        await diagram.locator('table[dir="ltr"]').evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
        ),
      ).toBe(true);
      await expectDiagramContainment(page, { narrow: true });
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('both localized lessons and exact attention evidence render without JavaScript', async ({
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
      await expect(page.locator('[data-score-kind="dot-products"]')).toContainText('6.000000');
      await expect(page.locator('[data-probability-row="0"]')).toContainText('0.014166');
      await expect(page.locator('[data-mixture-row="1"]')).toContainText('-2.994908');
      await expect(page.locator('.errors-card .error-case[data-state="rejected"]')).toHaveCount(5);
      await expect(page.locator('.errors-card')).toContainText(copy[locale].rankError);
      await expect(page.locator('.proof-card')).toContainText('gradcheck=true');
      await expect(page.locator('.proof-card')).toContainText('replay=bitwise');
      await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
      await expectDiagramContainment(page, { narrow: false });
      await expectBoundedBoxContainment(page);
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
