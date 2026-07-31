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

const chapterId = '25-rmsnorm';
type ChapterLocale = 'en' | 'ru';
const locales = ['en', 'ru'] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Normalize scale without subtracting the mean',
    description:
      'Implement last-axis RMSNorm, trace its input and gain gradients, and separate ideal scale invariance from epsilon-dominated behavior near zero.',
    headings: [
      'Predict RMS, then test the epsilon boundary',
      'Normalize the final feature axis',
      'Keep scale, gain, and axes distinct',
      'From batch statistics to pre-RMSNorm language models',
      'Compose RMSNorm from cumulative tape operations',
      'Compare rescaling across the epsilon boundary',
      'Predict before reading the evidence',
      'Project normalized features into query, key, and value tensors next',
    ],
    historyFragments: [
      'BatchNorm couples a training example to mini-batch statistics',
      'avoiding dependencies between training cases',
      'remove the mean statistic, normalize by RMS',
      'normalize the input of each Transformer sublayer',
    ],
    diagramTitle: 'Follow one feature vector through RMSNorm',
    diagramDescription:
      'Read exact Rust-authored values from input through RMS rescaling and learned gain, then compare scale, history, gradient, and rejected-boundary evidence.',
    zeroEnergy: 'Zero epsilon cannot normalize a row whose mean square is zero.',
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Нормализуйте масштаб, не вычитая среднее',
    description:
      'Реализуйте RMSNorm по последней оси, проследите градиенты по входу и коэффициенту масштаба и отделите идеальную инвариантность от поведения вблизи нуля, где преобладает эпсилон.',
    headings: [
      'Предскажите RMS, затем проверьте границу влияния эпсилона',
      'Нормализуйте последнюю ось признаков',
      'Не смешивайте масштаб, коэффициент и оси',
      'От статистик батча к языковым моделям с предварительной RMSNorm',
      'Соберите RMSNorm из уже реализованных операций ленты',
      'Сравните масштабирование по обе стороны границы влияния эпсилона',
      'Сначала сделайте предсказания',
      'Далее спроецируйте нормализованные признаки в тензоры запросов, ключей и значений',
    ],
    historyFragments: [
      'В BatchNorm результат для обучающего примера зависит от статистик мини-батча',
      'устраняя зависимость между примерами',
      'исключают среднее из статистик',
      'нормализуют вход каждого подслоя Transformer',
    ],
    diagramTitle: 'Проследите один вектор признаков через RMSNorm',
    diagramDescription:
      'Проследите точные значения из примера на Rust: от входа через масштабирование по RMS и обучаемый коэффициент до результатов сравнения масштабов, исторических методов, градиентов и отклонённых граничных случаев.',
    zeroEnergy:
      'При нулевом эпсилоне нельзя нормализовать строку с нулевым средним квадратов.',
    rankZero: 'У входа должна быть хотя бы одна ось.',
    widthMismatch:
      'Ширина последней оси признаков должна совпадать с шириной коэффициента масштаба.',
    diagramFragments: [
      'Сравните случаи с нулевым и конечным эпсилоном',
      'Величина, обратная RMS',
      'Первый дополнительный пример',
      'Второй дополнительный пример',
      'Опорный вектор сравнивается в двух отдельных батчах',
      'Градиент по входу',
      'Градиент коэффициента масштаба',
      'Группировка параметров оптимизатора',
      'Отклонённые граничные случаи',
      'Сплошная рамка — вход',
      'Пунктирная рамка — масштабирование по RMS',
      'Двойная рамка — применение коэффициента',
    ],
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
          const owner = element.closest<HTMLElement>(
            '.stage-card, .scale-card, .evidence-card, .proof-row article, td, th, p, li',
          );
          if (owner && !element.closest('.formula-scroller')) {
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

async function expectDiagramContainment(page: Page) {
  const diagram = page.locator('figure[data-visualization-id="rmsnorm"]');
  const result = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(
      node.querySelectorAll<HTMLElement>(
        '.stage-card, .scale-card, .evidence-card, .proof-row article',
      ),
    ).map((card) => ({ clientHeight: card.clientHeight, scrollHeight: card.scrollHeight })),
  }));
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
  for (const card of result.cards) {
    expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight + 2);
  }

  const scrollerProblems = await diagram
    .locator('.primary-scroller, .scale-scroller, .history-scroller, .formula-scroller')
    .evaluateAll((nodes) =>
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
}

async function expectBoundedBoxContainment(page: Page) {
  const problems = await page
    .locator('figure[data-visualization-id="rmsnorm"]')
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
          !node.classList.contains('bar-track') &&
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
          issues.push(
            `${describe(box, index)} has ${box.scrollWidth - box.clientWidth}px horizontal content debt`,
          );
        }
        if (box.scrollHeight > box.clientHeight + allowedError) {
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
    order: 25,
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
    String.raw`\operatorname{RMSNorm}(x)=`,
    String.raw`\operatorname{RMSNorm}_{0}(ax)=\operatorname{RMSNorm}_{0}(x)`,
    String.raw`\operatorname{mean}(\hat{x}^2)=`,
    String.raw`\bar x=[0.407293,-0.305470]`,
    String.raw`\bar g=[0.848528,-2.262741]`,
    String.raw`\Delta_{\mathrm{max}}=0.717566`,
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
  await expect(history.locator('a')).toHaveCount(4);

  await expect(page.locator('figure.rust-source')).toHaveCount(6);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'rmsnorm' });
  const diagram = page.locator('figure[data-visualization-id="rmsnorm"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram.locator('[data-stage="input"]')).toContainText('3.000000');
  await expect(diagram.locator('[data-stage="statistic"]')).toContainText('12.500000');
  await expect(diagram.locator('[data-stage="normalized"]')).toContainText('1.131370');
  await expect(diagram.locator('[data-stage="output"]')).toContainText('1.272792');
  await expect(diagram.locator('[data-scale-mode="ideal"]')).toContainText(
    '0.000000000000000222',
  );
  await expect(diagram.locator('[data-scale-mode="production"]')).toContainText('0.000000448');
  await expect(diagram.locator('[data-scale-mode="near-zero"]')).toContainText('0.717566');
  await expect(diagram.locator('[data-history-method]')).toHaveCount(3);
  await expect(diagram.locator('[data-history-method="batchnorm"]')).toContainText('-0.999999');
  await expect(diagram.locator('[data-history-method="batchnorm"]')).toContainText('0.000000');
  await expect(diagram.locator('[data-evidence="errors"] li')).toHaveCount(3);
  await expect(diagram.locator('[data-evidence="errors"]')).toContainText(localized.zeroEnergy);
  if (locale === 'ru') {
    await expect(diagram.locator('[data-evidence="errors"]')).toContainText(copy.ru.rankZero);
    await expect(diagram.locator('[data-evidence="errors"]')).toContainText(
      copy.ru.widthMismatch,
    );
    for (const fragment of copy.ru.diagramFragments) await expect(diagram).toContainText(fragment);
  }
  await expect(diagram.locator('[data-evidence="parameter"]')).toContainText('no_decay=true');
  await expect(diagram.locator('[data-evidence="proof"]')).toContainText('gradcheck=true');
  await expect(diagram.locator('[data-evidence="proof"]')).toContainText('replay=bitwise');

  for (const scroller of await diagram
    .locator('.primary-scroller, .scale-scroller, .history-scroller, .formula-scroller')
    .all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
  await expectDiagramContainment(page);
  await expectBoundedBoxContainment(page);

  const flow = await diagram.locator('.primary-flow').evaluate((node) => {
    const rect = (selector: string) =>
      (node.querySelector<HTMLElement>(selector) as HTMLElement).getBoundingClientRect();
    return {
      input: rect('[data-stage="input"]'),
      statistic: rect('[data-stage="statistic"]'),
      normalized: rect('[data-stage="normalized"]'),
      output: rect('[data-stage="output"]'),
    };
  });
  expect(flow.input.right).toBeLessThan(flow.statistic.left);
  expect(flow.statistic.right).toBeLessThan(flow.normalized.left);
  expect(flow.normalized.right).toBeLessThan(flow.output.left);

  if (narrow) {
    for (const selector of ['.primary-scroller', '.scale-scroller', '.history-scroller']) {
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
  await expect(details.locator('ol > li')).toHaveCount(9);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 25 RMSNorm vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('English and Russian publish reciprocal Chapter 25 routes', async ({ page }) => {
    for (const locale of locales) {
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.find((chapter) => chapter.chapterId === chapterId)).toEqual(
        expect.objectContaining({ chapterId, order: 25, title: copy[locale].title }),
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

  test('both Rust-backed lessons and natural-height evidence render at desktop and narrow widths', async ({
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

  test('solid, dashed, and double cues survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="rmsnorm"]');
      await expect(diagram.locator('[data-stage="input"]')).toHaveCSS('border-top-style', 'solid');
      await expect(diagram.locator('[data-stage="normalized"]')).toHaveCSS(
        'border-top-style',
        'dashed',
      );
      await expect(diagram.locator('[data-stage="output"]')).toHaveCSS(
        'border-top-style',
        'double',
      );
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('RTL prose mirrors arrows while formulas and technical values remain left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of locales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="rmsnorm"]');
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
      await expect(page.locator('[data-stage="output"]')).toContainText('1.272792');
      await expect(page.locator('[data-scale-mode="near-zero"]')).toContainText('0.717566');
      await expect(page.locator('[data-history-method]')).toHaveCount(3);
      await expect(page.locator('[data-evidence="errors"] li')).toHaveCount(3);
      await expect(page.locator('[data-evidence="errors"]')).toContainText(copy[locale].zeroEnergy);
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
