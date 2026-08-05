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

const chapterId = '24-residual-connections';
type ChapterLocale = 'en' | 'ru';
const locales = ['en', 'ru'] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Keep an identity path around each learned update',
    description:
      'Trace exact-shape residual addition, its identity and learned gradient paths, zero-branch learning, and repeated plain versus residual transformations.',
    headings: [
      'Predict what the identity path preserves',
      'Add a learned update to the unchanged stream',
      'Keep the stream and update roles separate',
      'From deep plain transformations to the Transformer residual stream',
      'Reject broadcasting before adding the paths',
      'Follow both paths without hiding the merge',
      'Predict before following the trace',
      'Normalize the branch input next',
    ],
    historyFragments: [
      'deeper plain networks could have higher training error',
      'parameter-free identity shortcut',
      'every encoder and decoder sublayer',
      'decoder-only Transformer maintains a residual stream',
      'Transformer architectures then reused that mechanism',
    ],
    diagramTitle: 'Follow the identity path and learned update',
    diagramDescription:
      'Trace exact fixture values through the forward merge and both reverse contributions, then compare zero-branch, shape-error, and four-layer stack evidence.',
    zeroBranchNote: 'total input gradient equal to the upstream gradient',
    rejected: 'Rejected',
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Для каждого обучаемого обновления сохраняйте тождественный путь',
    description:
      'Проследите остаточное сложение при точном совпадении форм, тождественный путь градиента и путь через обучаемую ветвь, обучение ветви с нулевыми весами и повторные преобразования с остаточными связями и без них.',
    headings: [
      'Предскажите, что сохраняет тождественный путь',
      'Добавьте обучаемое обновление к неизменённому потоку',
      'Не смешивайте роли потока и обновления',
      'От глубоких преобразований без остаточных связей к остаточному потоку Transformer',
      'Перед сложением отклоните несовпадающие формы',
      'Проследите оба пути и не потеряйте место сложения',
      'Сначала сделайте предсказания',
      'Далее нормализуйте вход ветви',
    ],
    historyFragments: [
      'сети без остаточных связей могли иметь большую ошибку',
      'тождественной обходной связи без параметров',
      'каждого подслоя энкодера и декодера',
      'Transformer только с декодером сохраняет остаточный поток',
      'архитектуры Transformer применили тот же механизм',
    ],
    diagramTitle: 'Проследите тождественный путь и обучаемое обновление',
    diagramDescription:
      'Проследите точные значения примера через прямое слияние и оба вклада обратного прохода, затем сопоставьте ветвь с нулевыми весами, ошибку формы и две четырёхслойные цепочки.',
    zeroBranchNote: 'полный градиент по входу равен входящему градиенту',
    rejected: 'Отклонено',
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
          const block = element.closest<HTMLElement>('p, li, td, th, .flow-node, .evidence-card');
          if (block) {
            const blockRect = block.getBoundingClientRect();
            if (rect.top < blockRect.top - 1 || rect.bottom > blockRect.bottom + 1) {
              issues.push(`${source} escapes its containing block vertically`);
            }
            const next = block.nextElementSibling as HTMLElement | null;
            if (next) {
              const nextRect = next.getBoundingClientRect();
              const horizontal = rect.left < nextRect.right - 1 && nextRect.left < rect.right - 1;
              const followsVertically = nextRect.top >= blockRect.bottom - 1;
              if (horizontal && followsVertically && rect.bottom > nextRect.top + 1) {
                issues.push(`${source} overlaps the following block`);
              }
            }
          }
          const owner = element.closest<HTMLElement>(
            '.flow-node, .evidence-card, .proof-row article, td, th',
          );
          const formulaScroller = element.closest<HTMLElement>('.formula-scroller');
          if (owner && !formulaScroller) {
            const ownerRect = owner.getBoundingClientRect();
            if (rect.left < ownerRect.left - 1 || rect.right > ownerRect.right + 1) {
              issues.push(`${source} crosses its node or card border`);
            }
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectLocalFormulaSeparation(page: Page) {
  const overlaps = await page
    .locator(
      'figure[data-visualization-id="residual-connections"] .flow-node, figure[data-visualization-id="residual-connections"] .evidence-card, figure[data-visualization-id="residual-connections"] td',
    )
    .evaluateAll((containers) =>
      containers.flatMap((container, containerIndex) => {
        const formulas = Array.from(
          container.querySelectorAll<HTMLElement>('[data-inline-math] > .katex'),
        );
        const issues: string[] = [];
        for (let leftIndex = 0; leftIndex < formulas.length; leftIndex += 1) {
          const left = formulas[leftIndex].getBoundingClientRect();
          for (let rightIndex = leftIndex + 1; rightIndex < formulas.length; rightIndex += 1) {
            const right = formulas[rightIndex].getBoundingClientRect();
            const horizontal = left.left < right.right - 1 && right.left < left.right - 1;
            const vertical = left.top < right.bottom - 1 && right.top < left.bottom - 1;
            if (horizontal && vertical) {
              issues.push(
                `container ${containerIndex} formulas ${leftIndex} and ${rightIndex} overlap`,
              );
            }
          }
        }
        return issues;
      }),
    );
  expect(overlaps).toEqual([]);
}

async function expectFormulaScrollerOwnership(page: Page) {
  const problems = await page
    .locator('figure[data-visualization-id="residual-connections"] .formula-scroller')
    .evaluateAll((scrollers) =>
      scrollers.flatMap((node, index) => {
        const scroller = node as HTMLElement;
        const issues: string[] = [];
        const style = getComputedStyle(scroller);
        if (!['auto', 'scroll'].includes(style.overflowX)) {
          issues.push(`formula scroller ${index} is not horizontally scrollable`);
        }
        if (scroller.getAttribute('role') !== 'region' || !scroller.getAttribute('aria-label')) {
          issues.push(`formula scroller ${index} is not a named region`);
        }
        if (scroller.scrollHeight > scroller.clientHeight + 2) {
          issues.push(`formula scroller ${index} clips vertically`);
        }
        const scrollerRect = scroller.getBoundingClientRect();
        const owner = scroller.closest<HTMLElement>('.evidence-card, .proof-row article');
        if (owner) {
          const ownerRect = owner.getBoundingClientRect();
          if (scrollerRect.left < ownerRect.left - 1 || scrollerRect.right > ownerRect.right + 1) {
            issues.push(`formula scroller ${index} crosses its card border`);
          }
        }
        const formulas = Array.from(
          scroller.querySelectorAll<HTMLElement>('[data-inline-math] > .katex'),
        );
        if (formulas.length === 0) issues.push(`formula scroller ${index} has no formula`);
        for (const formula of formulas) {
          const formulaRect = formula.getBoundingClientRect();
          const contentLeft = formulaRect.left - scrollerRect.left + scroller.scrollLeft;
          const contentRight = formulaRect.right - scrollerRect.left + scroller.scrollLeft;
          if (contentLeft < -1 || contentRight > scroller.scrollWidth + 1) {
            issues.push(`formula scroller ${index} does not own its KaTeX width`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectBoundedBoxContainment(page: Page) {
  const problems = await page
    .locator('figure[data-visualization-id="residual-connections"]')
    .evaluate((root) => {
      const issues: string[] = [];
      const allowedError = 2;
      const describe = (node: HTMLElement, index: number) =>
        `${node.tagName.toLowerCase()}${node.className ? `.${String(node.className).split(/\s+/).slice(0, 2).join('.')}` : ''} ${index}`;
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
        return widths.every((width) => width > 0) && styles.every((value) => !['none', 'hidden'].includes(value));
      };
      const all = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((node) => {
        const style = getComputedStyle(node);
        return node.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
      for (const [index, node] of all.entries()) {
        if (node.closest('[data-diagram-full-view-controls]')) continue;
        // KaTeX's renderer uses internal clipping for its accessibility copy,
        // struts, and narrow inline fallback. Formula geometry is audited above.
        if (node.closest('.katex')) continue;
        const style = getComputedStyle(node);
        if (['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY)) {
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
      for (const [index, box] of boxes.entries()) {
        if (!hasCompleteBorder(box)) issues.push(`${describe(box, index)} lacks a complete border`);
        if (box.scrollWidth > box.clientWidth + allowedError) {
          issues.push(`${describe(box, index)} has ${box.scrollWidth - box.clientWidth}px horizontal content debt`);
        }
        if (box.scrollHeight > box.clientHeight + allowedError) {
          issues.push(`${describe(box, index)} has ${box.scrollHeight - box.clientHeight}px vertical content debt`);
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
    order: 24,
    revision: 3,
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
    String.raw`y=x+F(x)`,
    String.raw`\operatorname{shape}(F(x))=\operatorname{shape}(x)=\operatorname{shape}(y)`,
    String.raw`\bar{x}=\bar{y}+J_F(x)^\top\bar{y}`,
    String.raw`y=x+\alpha F(x)`,
    String.raw`\operatorname{shape}(x)=[2]`,
    String.raw`J_F(x)^\top\bar y=[-0.500000,2.250000]`,
    String.raw`\bar W=[2.000000,2.000000,-1.000000,-1.000000]\ne0`,
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

  await expect(page.locator('figure.rust-source')).toHaveCount(7);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'residual-connections' });
  const diagram = page.locator('figure[data-visualization-id="residual-connections"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram.locator('[data-flow="forward"]')).toContainText('1.000000');
  await expect(diagram.locator('[data-flow="forward"]')).toContainText('-3.250000');
  await expect(diagram.locator('[data-flow="backward"]')).toContainText('-0.500000');
  await expect(diagram.locator('[data-flow="backward"]')).toContainText('3.250000');
  await expect(diagram.locator('[data-evidence="zero-branch"]')).toContainText('2.000000');
  await expect(diagram.locator('[data-evidence="zero-branch"]')).toContainText(
    localized.zeroBranchNote,
  );
  await expect(diagram.locator('[data-evidence="shape-error"]')).toContainText(localized.rejected);
  await expect(diagram.locator('[data-evidence="shape-error"]')).toContainText(
    'broadcastable=true',
  );
  await expect(diagram.locator('[data-evidence="shape-error"]')).toContainText('rejected=true');
  await expect(diagram.locator('.proof-row')).toContainText('passed=true');
  await expect(diagram.locator('.proof-row')).toContainText('known-residual-linear');
  await expect(diagram.locator('.proof-row')).toContainText('broadcast=forbidden');
  await expect(diagram.locator('tbody tr')).toHaveCount(5);
  await expect(diagram.locator('.parameter-list li')).toHaveCount(4);

  for (const scroller of await diagram
    .locator('.flow-scroller, .table-scroller, .formula-scroller')
    .all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
  await expectFormulaScrollerOwnership(page);
  await expectBoundedBoxContainment(page);

  const containment = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    natural: Array.from(
      node.querySelectorAll<HTMLElement>('.flow-node, .evidence-card, .proof-row article'),
    ).map((part) => ({ clientHeight: part.clientHeight, scrollHeight: part.scrollHeight })),
  }));
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth);
  for (const part of containment.natural) {
    expect(part.scrollHeight).toBeLessThanOrEqual(part.clientHeight + 2);
  }

  const topology = await diagram.locator('[data-flow="forward"]').evaluate((node) => {
    const rect = (selector: string) =>
      (node.querySelector<HTMLElement>(selector) as HTMLElement).getBoundingClientRect();
    return {
      input: rect('[data-node="forward-input"]'),
      identity: rect('[data-path="identity"]'),
      branch: rect('[data-path="branch"]'),
      merge: rect('[data-node="forward-merge"]'),
      output: rect('[data-node="forward-output"]'),
    };
  });
  expect(topology.identity.top).toBeLessThan(topology.branch.top);
  expect(topology.input.right).toBeLessThan(topology.identity.left);
  expect(topology.identity.right).toBeLessThan(topology.merge.left);
  expect(topology.merge.right).toBeLessThan(topology.output.left);
  await expectLocalFormulaSeparation(page);

  if (narrow) {
    for (const selector of ['[data-flow="forward"]', '[data-flow="backward"]', '.table-scroller']) {
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
  await expect(details.locator('ol > li')).toHaveCount(8);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 24 residual connections vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English and Russian publish reciprocal Chapter 24 routes', async ({ page }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.find((chapter) => chapter.chapterId === chapterId)).toEqual(
        expect.objectContaining({ chapterId, order: 24, title: copy[locale].title }),
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

  test('both Rust-backed lessons and natural-height flows render at desktop and narrow widths', async ({
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

  test('solid identity, dashed branch, and double merge cues survive forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="residual-connections"]');
      await expect(diagram.locator('[data-path="identity"]')).toHaveCSS('border-top-style', 'solid');
      await expect(diagram.locator('[data-path="branch"]')).toHaveCSS('border-top-style', 'dashed');
      await expect(diagram.locator('[data-node="forward-merge"]')).toHaveCSS(
        'border-top-style',
        'double',
      );
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('RTL prose mirrors arrows while formulas and program identities remain left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="residual-connections"]');
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
    }
  });

  test('the lesson and exact trace render without JavaScript', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      await expect(page.getByRole('heading', { level: 1, name: copy[locale].title })).toBeVisible();
      await expect(page.locator('[data-flow="forward"]')).toContainText('-3.250000');
      await expect(page.locator('[data-flow="backward"]')).toContainText('3.250000');
      await expect(page.locator('tbody tr')).toHaveCount(5);
      await expect(page.locator('[data-evidence="shape-error"]')).toContainText(copy[locale].rejected);
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
