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
type ChapterLocale = 'en' | 'ru';
const locales = ['en', 'ru'] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Block future keys with a causal mask',
    description:
      'Learn how an inclusive lower-triangular causal mask blocks future Transformer keys, assigns them exactly zero attention probability, and preserves earlier outputs.',
    headings: [
      'Predict the visible triangle',
      'Mask before softmax',
      'Keep visibility separate from position',
      'From recurrent prefix state to an explicit decoder mask',
      'Keep the mask inspectable and recorded values finite',
      'Follow the lower triangle through attention',
      'Predict before opening the answers',
      'Preserve the prefix boundary as the decoder grows',
    ],
    historyFragments: [
      'future elements do not yet exist',
      'shifted by one position',
      'evaluated together during training',
      'autoregressive decoding still appends one token at a time',
    ],
    diagramTitle: 'See the causal boundary in every attention row',
    diagramDescription:
      'Follow the query, key, and value rows through the lower-triangular visibility rule, then compare the original and suffix-replaced outputs and inspect the gradients.',
    blocked: 'Blocked',
    unchanged: 'Bitwise unchanged',
    changed: 'Changed',
    verified: 'Verified',
    finiteTape: 'Recorded autodiff values remain finite',
    futureProbabilities: 'Future-key probabilities',
    exactZero: 'Exactly zero',
    historyDiagramFragments: [
      'only the already generated prefix exists',
      'shifted decoder inputs and a causal mask',
      'generation remains sequential',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Закройте доступ к будущим ключам каузальной маской',
    description:
      'Разберите, как нижнетреугольная каузальная маска с разрешённой диагональю закрывает доступ к будущим ключам Transformer, делает их вероятности внимания строго нулевыми и сохраняет выходы предыдущих позиций.',
    headings: [
      'Предскажите видимый треугольник',
      'Примените маску до softmax',
      'Не путайте ограничение видимости с позиционной информацией',
      'От рекуррентного состояния префикса к явной маске декодера',
      'Оставьте маску доступной для проверки, а записанные значения — конечными',
      'Проследите путь внимания по нижнему треугольнику',
      'Сначала сделайте прогноз, затем откройте ответы',
      'Сохраняйте границу префикса по мере роста декодера',
    ],
    historyFragments: [
      'будущих элементов ещё не существует',
      'сдвинутыми на одну позицию',
      'можно вычислять вместе',
      'добавляет по одному токену',
    ],
    diagramTitle: 'Проследите каузальную границу в каждой строке внимания',
    diagramDescription:
      'Проследите путь строк запросов, ключей и значений через нижнетреугольное ограничение видимости, затем сравните исходные выходы с выходами после замены суффикса и изучите градиенты.',
    blocked: 'Закрыто',
    unchanged: 'Побитно совпадает с исходным',
    changed: 'Изменилось',
    verified: 'Проверено',
    finiteTape: 'Записанные значения для автоматического дифференцирования остаются конечными',
    futureProbabilities: 'Вероятности будущих ключей',
    exactZero: 'Строго равны нулю',
    historyDiagramFragments: [
      'существует только уже созданный префикс',
      'сдвинутые входы декодера и каузальная маска',
      'генерация остаётся последовательной',
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
    .locator(
      '.lesson-body .katex-display, .lesson-body [data-inline-math] > .katex',
    )
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();
        const source =
          element.querySelector('annotation[encoding="application/x-tex"]')
            ?.textContent ?? `formula ${index}`;
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
          (rect.left < -1 ||
            rect.right > document.documentElement.clientWidth + 1) &&
          !localScroller
        ) {
          issues.push(`${source} escapes the viewport`);
        }
        if (rect.width <= 0 || rect.height <= 0)
          issues.push(`${source} has no visible box`);
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
            const top = Math.min(
              ...renderedBoxes.map((rendered) => rendered.top),
            );
            const bottom = Math.max(
              ...renderedBoxes.map((rendered) => rendered.bottom),
            );
            if (top < rect.top - 1)
              issues.push(`${source} clips its upper rendered limit`);
            if (bottom > rect.bottom + 1)
              issues.push(`${source} clips its lower rendered limit`);
          }
          const owner = element.parentElement;
          const next = owner?.nextElementSibling as HTMLElement | null;
          if (
            owner &&
            next &&
            owner.getBoundingClientRect().bottom >
              next.getBoundingClientRect().top + 1
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
  const diagram = page.locator(
    'figure[data-visualization-id="causal-masking"]',
  );
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(
      node.querySelectorAll<HTMLElement>('[data-diagram-card]'),
    ).map((card, index) => ({
      label:
        card.getAttribute('data-input-role') ??
        card.getAttribute('data-evidence-kind') ??
        card.getAttribute('data-history-kind') ??
        card.getAttribute('data-state') ??
        String(index),
      clientHeight: card.clientHeight,
      scrollHeight: card.scrollHeight,
      clientWidth: card.clientWidth,
      scrollWidth: card.scrollWidth,
    })),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  for (const card of result.cards) {
    expect(
      card.scrollWidth,
      `${card.label} horizontal containment`,
    ).toBeLessThanOrEqual(card.clientWidth + 2);
  }

  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(6);
  const audit = await scrollers.evaluateAll((nodes) =>
    nodes.map((node, index) => {
      const scroller = node as HTMLElement;
      const style = getComputedStyle(scroller);
      const issues: string[] = [];
      const bounds = scroller.getBoundingClientRect();
      const paintedVerticalOverflow = Array.from(scroller.children).some(
        (child) => {
          const rect = child.getBoundingClientRect();
          return rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2;
        },
      );
      if (!['auto', 'scroll'].includes(style.overflowX)) {
        issues.push(`scroller ${index} does not own horizontal overflow`);
      }
      if (
        scroller.getAttribute('role') !== 'region' ||
        scroller.getAttribute('tabindex') !== '0' ||
        !scroller.getAttribute('aria-label')
      ) {
        issues.push(
          `scroller ${index} is not a named keyboard-reachable region`,
        );
      }
      if (
        scroller.scrollHeight > scroller.clientHeight + 2 &&
        paintedVerticalOverflow
      ) {
        issues.push(`scroller ${index} clips vertically`);
      }
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
    .locator('figure[data-visualization-id="causal-masking"]')
    .evaluate((root) => {
      const issues: string[] = [];
      const tolerance = 2;
      const visible = (node: HTMLElement) => {
        const style = getComputedStyle(node);
        return (
          node.getClientRects().length > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      };
      const completeBorder = (node: HTMLElement) => {
        const style = getComputedStyle(node);
        return [
          [style.borderTopWidth, style.borderTopStyle],
          [style.borderRightWidth, style.borderRightStyle],
          [style.borderBottomWidth, style.borderBottomStyle],
          [style.borderLeftWidth, style.borderLeftStyle],
        ].every(
          ([width, borderStyle]) =>
            Number.parseFloat(width) > 0 &&
            !['none', 'hidden'].includes(borderStyle),
        );
      };
      const all = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
        visible,
      );
      for (const [index, node] of all.entries()) {
        if (
          node.closest('[data-diagram-full-view-controls]') ||
          node.closest('.katex')
        )
          continue;
        const style = getComputedStyle(node);
        if (
          ['hidden', 'clip'].includes(style.overflowX) ||
          ['hidden', 'clip'].includes(style.overflowY)
        )
          issues.push(`element ${index} conceals overflow`);
        if (
          completeBorder(node) &&
          !node.hasAttribute('data-diagram-box') &&
          !['TH', 'TD'].includes(node.tagName)
        )
          issues.push(`bordered element ${index} lacks data-diagram-box`);
      }
      const boxes = all.filter(
        (node) =>
          node.hasAttribute('data-diagram-box') ||
          ['TH', 'TD'].includes(node.tagName),
      );
      for (const [index, box] of boxes.entries()) {
        const label = `${box.tagName.toLowerCase()}${
          box.className
            ? `.${String(box.className).split(/\s+/).slice(0, 3).join('.')}`
            : ''
        }[${index};stage=${box.closest('[data-causal-stage]')?.getAttribute('data-causal-stage') ?? 'none'};table=${box.closest('table')?.className ?? 'none'};prefix=${box.closest('[data-prefix-position]')?.getAttribute('data-prefix-position') ?? 'none'};gradient=${box.closest('[data-gradient-target]')?.getAttribute('data-gradient-target') ?? 'none'};q=${box.getAttribute('data-query') ?? 'none'};k=${box.getAttribute('data-key') ?? 'none'}]`;
        if (!completeBorder(box))
          issues.push(`${label} lacks a complete border`);
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
          const nestedScroller = parent?.closest<HTMLElement>(
            '[data-diagram-scroll]',
          );
          if (
            parent &&
            (textNode.textContent ?? '').trim() &&
            !parent.closest('.katex-mathml') &&
            (!nestedScroller ||
              nestedScroller === box ||
              !box.contains(nestedScroller))
          ) {
            const range = document.createRange();
            range.selectNodeContents(textNode);
            painted.push(...Array.from(range.getClientRects()));
          }
          textNode = walker.nextNode();
        }
        for (const formula of box.querySelectorAll<HTMLElement>('.katex')) {
          const nestedScroller = formula.closest<HTMLElement>(
            '[data-diagram-scroll]',
          );
          if (
            !nestedScroller ||
            nestedScroller === box ||
            !box.contains(nestedScroller)
          ) {
            painted.push(formula.getBoundingClientRect());
          }
        }
        const horizontalOverflow = painted.find(
          (rect) =>
            rect.left < inner.left - tolerance ||
            rect.right > inner.right + tolerance,
        );
        if (horizontalOverflow) {
          issues.push(
            `${label} lets painted text cross its inline border ` +
              `(inner=${inner.left.toFixed(2)}..${inner.right.toFixed(2)}, ` +
              `paint=${horizontalOverflow.left.toFixed(2)}..${horizontalOverflow.right.toFixed(2)})`,
          );
        }
        if (
          painted.some(
            (rect) =>
              rect.top < inner.top - tolerance ||
              rect.bottom > inner.bottom + tolerance,
          )
        ) {
          issues.push(`${label} lets painted text cross its block border`);
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
    order: 28,
    revision: 2,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: locales,
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(
    localized.description,
  );
  await expectSeoDescription(page, localized.description);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [
    String.raw`M_{ij}=\begin{cases}0&j\le i\\-\infty&j>i\end{cases},\quad A=\operatorname{softmax}(S+M)`,
    String.raw`A=\operatorname{softmax}(S+M),\qquad O=AV`,
    String.raw`\sum_{j=0}^{i}A_{bij}=1`,
    String.raw`A_{bij}=0,\qquad j>i`,
    String.raw`\bar S_{bij}=0,\qquad j>i`,
    String.raw`\frac{\partial L_{\le1}}{\partial q_2}`,
  ]) {
    expect(
      annotations
        .map(normalizeMath)
        .some((formula) => formula.includes(normalizeMath(expected))),
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
  const historyText = (await history.allInnerTexts())
    .join(' ')
    .replace(/\s+/g, ' ');
  for (const fragment of localized.historyFragments)
    expect(historyText).toContain(fragment);
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(2);

  await expect(page.locator('figure.rust-source')).toHaveCount(4);
  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'causal-masking',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="causal-masking"]',
  );
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
  await expect(diagram.locator('[data-input-role]')).toHaveCount(3);
  await expect(
    diagram.locator('[data-causal-stage="mask"] td[data-visibility="allowed"]'),
  ).toHaveCount(6);
  await expect(
    diagram.locator('[data-causal-stage="mask"] td[data-visibility="blocked"]'),
  ).toHaveCount(3);
  await expect(
    diagram.locator('[data-causal-stage="mask"] td[data-diagonal="true"]'),
  ).toHaveCount(3);
  await expect(
    diagram
      .locator('[data-causal-stage="mask"] td[data-visibility="blocked"]')
      .first(),
  ).toContainText('−∞');
  await expect(
    diagram.locator(
      '[data-causal-stage="probabilities"] td[data-visibility="blocked"]',
    ),
  ).toHaveText([
    new RegExp(`0\\.000000.*${localized.blocked}`),
    new RegExp(`0\\.000000.*${localized.blocked}`),
    new RegExp(`0\\.000000.*${localized.blocked}`),
  ]);
  await expect(diagram.locator('.row-sums li')).toHaveText([
    /q0.*1\.000000/,
    /q1.*1\.000000/,
    /q2.*1\.000000/,
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
  await expect(diagram.locator('[data-prefix-position="0"]')).toContainText(
    localized.unchanged,
  );
  await expect(diagram.locator('[data-prefix-position="2"]')).toContainText(
    localized.changed,
  );
  await expect(diagram.locator('[data-prefix-position="2"]')).toContainText(
    '3.287932',
  );
  await expect(
    diagram.locator('[data-evidence-kind="prefix-zero"]'),
  ).toHaveAttribute('data-suffix-zero', 'true');
  await expect(
    diagram.locator('[data-evidence-kind="prefix-zero"]'),
  ).toContainText(localized.verified);
  await expect(
    diagram.locator('[data-evidence-kind="prefix-gradient"]'),
  ).toContainText('0.000000');
  await expect(diagram.locator('.error-list li')).toHaveCount(6);
  await expect(diagram.locator('.error-list li code').first()).toHaveText(
    'empty-tokens',
  );
  await expect(diagram.locator('.proof-card')).toHaveAttribute(
    'data-tape-finite',
    'true',
  );
  await expect(diagram.locator('.proof-card')).toHaveAttribute(
    'data-future-probabilities',
    'exact-zero',
  );
  await expect(diagram.locator('.proof-card')).toContainText(
    localized.finiteTape,
  );
  await expect(diagram.locator('.proof-card')).toContainText(
    localized.futureProbabilities,
  );
  await expect(diagram.locator('.proof-card')).toContainText(
    localized.exactZero,
  );
  const diagramHistory = diagram.locator('.history-section');
  for (const fragment of localized.historyDiagramFragments) {
    await expect(diagramHistory).toContainText(fragment);
  }
  await expect(diagramHistory).not.toContainText(
    'recurrent-autoregressive-state',
  );
  await expect(diagramHistory).not.toContainText('parallel-known-targets');

  await expectDiagramContainment(page, narrow);
  await expectBoundedBoxContainment(page);
  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(7);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  'chapter 28 localized causal masking vertical slice',
  {
    tag: chapterTag(chapterId),
  },
  () => {
    test('English and Russian publish reciprocal Chapter 28 routes', async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(
          chapters.find((chapter) => chapter.chapterId === chapterId),
        ).toEqual(
          expect.objectContaining({
            chapterId,
            order: 28,
            title: copy[locale].title,
          }),
        );
        await page.goto(chapterPath(locale, chapterId));
        const other: ChapterLocale = locale === 'en' ? 'ru' : 'en';
        await expect(
          page.locator('.locale-switch a[data-locale="' + other + '"]'),
        ).toHaveAttribute('href', chapterPath(other, chapterId));
        await expect(
          page.locator('link[rel="alternate"][hreflang="' + other + '"]'),
        ).toHaveCount(1);
        await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
      }
    });

    test('both lessons and diagrams render at desktop and narrow widths', async ({
      page,
    }) => {
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

    test('English and Russian render the same mathematical annotations', async ({
      page,
    }) => {
      const formulas = new Map<ChapterLocale, string[]>();
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        formulas.set(
          locale,
          (
            await page
              .locator('.lesson-body annotation[encoding="application/x-tex"]')
              .allTextContents()
          ).map(normalizeMath),
        );
      }
      expect(formulas.get('ru')).toEqual(formulas.get('en'));
    });

    test('full view reuses each localized semantic figure and restores focus', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 1280, height: 900 });
      const controlNames: string[] = [];
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        await page.waitForFunction(
          () =>
            document.documentElement.dataset.diagramFullViewReady === 'true',
        );
        await settle(page);
        const diagram = page.locator(
          'figure[data-visualization-id="causal-masking"]',
        );
        const toggle = diagram.locator('[data-diagram-full-view-toggle]');
        await expect(
          page.locator('[data-diagram-full-view-toggle]'),
        ).toHaveCount(1);
        await expect(toggle).toBeVisible();
        const controlName =
          (await toggle.getAttribute('aria-label'))?.trim() ?? '';
        expect(controlName).not.toBe('');
        controlNames.push(controlName);
        const before = await diagram.evaluate((node) => ({
          boxes: node.querySelectorAll('[data-diagram-box]').length,
          cards: node.querySelectorAll('[data-diagram-card]').length,
          scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
          formulas: node.querySelectorAll('.katex').length,
          tables: node.querySelectorAll('table').length,
          figures: document.querySelectorAll(
            'figure[data-visualization-id="causal-masking"]',
          ).length,
        }));
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute(
              'data-visualization-id',
            ) === 'causal-masking',
        );
        await settle(page);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const after = await diagram.evaluate((node) => ({
          boxes: node.querySelectorAll('[data-diagram-box]').length,
          cards: node.querySelectorAll('[data-diagram-card]').length,
          scrollers: node.querySelectorAll('[data-diagram-scroll]').length,
          formulas: node.querySelectorAll('.katex').length,
          tables: node.querySelectorAll('table').length,
          figures: document.querySelectorAll(
            'figure[data-visualization-id="causal-masking"]',
          ).length,
          inlineDebt: node.scrollWidth - node.clientWidth,
          maximumRegionDebt: Math.max(
            0,
            ...Array.from(
              node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
            ).map((region) => region.scrollWidth - region.clientWidth),
          ),
        }));
        expect({
          boxes: after.boxes,
          cards: after.cards,
          scrollers: after.scrollers,
          formulas: after.formulas,
          tables: after.tables,
          figures: after.figures,
        }).toEqual(before);
        expect(after.figures).toBe(1);
        expect(after.inlineDebt).toBeLessThanOrEqual(2);
        expect(after.maximumRegionDebt).toBeLessThanOrEqual(320);
        await expectDiagramContainment(page, false);
        await expectBoundedBoxContainment(page);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toBeFocused();
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test('allowed, blocked, and diagonal cues survive forced colors', async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="causal-masking"]',
        );
        await expect(
          diagram
            .locator('[data-causal-stage="mask"] td[data-visibility="allowed"]')
            .nth(1),
        ).toHaveCSS('border-top-style', 'solid');
        await expect(
          diagram
            .locator('[data-causal-stage="mask"] td[data-visibility="blocked"]')
            .first(),
        ).toHaveCSS('border-top-style', 'dashed');
        await expect(
          diagram
            .locator('[data-causal-stage="mask"] td[data-diagonal="true"]')
            .first(),
        ).toHaveCSS('border-top-style', 'double');
        await expectBoundedBoxContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test('RTL prose keeps formulas and technical values left-to-right', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="causal-masking"]',
        );
        await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
        await expect(diagram.locator('.diagram-description')).toHaveCSS(
          'direction',
          'rtl',
        );
        await expect(diagram.locator('.input-role').first()).toHaveCSS(
          'direction',
          'rtl',
        );
        expect(
          await diagram
            .locator(
              '.input-grid, .triangle-grid, .matrix-table, .evidence-table',
            )
            .evaluateAll((nodes) =>
              nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
            ),
        ).toBe(true);
        const columnLefts = await diagram
          .locator('[data-causal-stage="mask"] thead th')
          .evaluateAll((nodes) =>
            nodes.map((node) => node.getBoundingClientRect().left),
          );
        expect(columnLefts).toEqual(
          [...columnLefts].sort((left, right) => left - right),
        );
        expect(
          await diagram
            .locator('bdi[dir="ltr"]')
            .evaluateAll((nodes) =>
              nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
            ),
        ).toBe(true);
        expect(
          await diagram
            .locator('[data-inline-math]')
            .evaluateAll((nodes) =>
              nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
            ),
        ).toBe(true);
        await expectDiagramContainment(page, true);
        await expectBoundedBoxContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

  },
);
