// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync, readdirSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  MATERIAL_OVERFLOW_PX,
  MATERIAL_OVERFLOW_RATIO,
  MINIMUM_FULLSCREEN_GAIN_PX,
} from '../../src/lib/diagram-full-view';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { parseJsonFrontmatter } from '../../../scripts/check-site-content.mjs';
import {
  expectNoPageOverflow,
  expectOnlySharedDiagramClientScript,
} from './chapter-helpers';

declare const process: { cwd(): string };

interface DiagramRoute {
  chapterId: string;
  order: number;
  path: string;
  visualizationId: string;
}

interface DiagramMetrics {
  bodyWidth: number;
  controls: number;
  documentWidth: number;
  figureWidth: number;
  fullscreen: boolean;
  innerWidth: number;
  materialOwners: number;
  maximumOverflowDebt: number;
  maximumOverflowOwner: string;
  overflowDebt: number;
  pageWidth: number;
  shouldEnhance: boolean;
  staticCounts: {
    captions: number;
    formulas: number;
    lists: number;
    tables: number;
  };
  textFontSize: number;
  unnamedOwners: string[];
}

const desktop = { width: 1280, height: 900 } as const;
const mobile = { width: 390, height: 844 } as const;
const englishChapterDirectory = resolve(
  process.cwd(),
  'src/content/chapters/en',
);

const diagramRoutes = (readdirSync(englishChapterDirectory) as string[])
  .filter((name: string) => name.endsWith('.mdx'))
  .flatMap((name: string): DiagramRoute[] => {
    const source = readFileSync(resolve(englishChapterDirectory, name), 'utf8');
    const { data } = parseJsonFrontmatter(source, name);
    if (data.visualization.decision !== 'useful') return [];
    return [{
      chapterId: data.chapter_id as string,
      order: data.order as number,
      path: `/en/course/${data.chapter_id}/`,
      visualizationId: data.visualization.id as string,
    }];
  })
  .sort((left, right) => left.order - right.order);

const chapter30 = diagramRoutes.find(({ order }) => order === 30);
if (!chapter30) throw new Error('Chapter 30 must register a useful diagram.');

function figureFor(page: Page, route: DiagramRoute): Locator {
  return page.locator(
    `figure[data-visualization-id="${route.visualizationId}"]`,
  );
}

async function waitForController(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.diagramFullViewReady === 'true',
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function readMetrics(page: Page, route: DiagramRoute): Promise<DiagramMetrics> {
  return figureFor(page, route).evaluate(
    (figure, limits) => {
      const root = figure as HTMLElement;
      const elements = [root, ...root.querySelectorAll<HTMLElement>('*')];
      const scrollOwners = elements.filter((element) => {
        if (element.closest('[data-diagram-full-view-controls]')) return false;
        const style = getComputedStyle(element);
        return (
          element.getClientRects().length > 0 &&
          ['auto', 'scroll'].includes(style.overflowX) &&
          element.scrollWidth > element.clientWidth + 2
        );
      });
      const materialOwners = scrollOwners.filter((element) => {
        const debt = element.scrollWidth - element.clientWidth;
        return (
          element.clientWidth > 0 &&
          debt >= Math.max(limits.minimumOverflow, element.clientWidth * limits.ratio)
        );
      });
      const accessibleName = (element: HTMLElement) => {
        const direct = element.getAttribute('aria-label')?.trim();
        if (direct) return direct;
        return (element.getAttribute('aria-labelledby') ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ');
      };
      const unnamedOwners = scrollOwners.flatMap((element, index) => {
        const problems = [];
        if (element.getAttribute('role') !== 'region') problems.push('missing role=region');
        if (element.getAttribute('tabindex') !== '0') problems.push('missing tabindex=0');
        if (!accessibleName(element)) problems.push('missing accessible name');
        return problems.length === 0
          ? []
          : [`${element.tagName.toLowerCase()}.${element.className || index}: ${problems.join(', ')}`];
      });
      const textProbe =
        root.querySelector<HTMLElement>(
          'figcaption p, figcaption, td, th, li, p',
        ) ?? root;
      const fullscreenContentWidth = Math.max(0, window.innerWidth - 48);
      const offersUsefulWidth =
        fullscreenContentWidth - root.clientWidth >= limits.minimumGain;
      const mediaMatches = matchMedia(
        '(min-width: 64rem) and (min-height: 36rem)',
      ).matches;
      const overflowDebts = scrollOwners
        .map((owner) => ({
          debt: owner.scrollWidth - owner.clientWidth,
          owner: `${owner.tagName.toLowerCase()}.${owner.className || '(no class)'}`,
        }))
        .sort((left, right) => right.debt - left.debt);

      return {
        bodyWidth: document.body.scrollWidth,
        controls: root.querySelectorAll('[data-diagram-full-view-controls]').length,
        documentWidth: document.documentElement.scrollWidth,
        figureWidth: root.getBoundingClientRect().width,
        fullscreen: document.fullscreenElement === root,
        innerWidth: window.innerWidth,
        materialOwners: materialOwners.length,
        maximumOverflowDebt: Math.max(
          0,
          ...overflowDebts.map(({ debt }) => debt),
        ),
        maximumOverflowOwner: overflowDebts[0]?.owner ?? '',
        overflowDebt: scrollOwners.reduce(
          (sum, owner) => sum + Math.max(0, owner.scrollWidth - owner.clientWidth),
          0,
        ),
        pageWidth: document.documentElement.clientWidth,
        shouldEnhance:
          !document.fullscreenElement &&
          document.fullscreenEnabled &&
          mediaMatches &&
          offersUsefulWidth &&
          materialOwners.length > 0,
        staticCounts: {
          captions: root.querySelectorAll('figcaption').length,
          formulas: root.querySelectorAll('.katex').length,
          lists: root.querySelectorAll('ol, ul, dl').length,
          tables: root.querySelectorAll('table').length,
        },
        textFontSize: Number.parseFloat(getComputedStyle(textProbe).fontSize),
        unnamedOwners,
      };
    },
    {
      minimumGain: MINIMUM_FULLSCREEN_GAIN_PX,
      minimumOverflow: MATERIAL_OVERFLOW_PX,
      ratio: MATERIAL_OVERFLOW_RATIO,
    },
  );
}

async function expectStaticDiagram(page: Page, route: DiagramRoute) {
  const figures = page.locator('figure[data-visualization-id]');
  await expect(figures).toHaveCount(1);
  const figure = figureFor(page, route);
  await expect(figure).toHaveCount(1);
  await expect(figure.locator('figcaption')).toHaveCount(1);
  await expect(figure.locator('figcaption')).not.toHaveText('');
  await expect(figure).toHaveAttribute('aria-labelledby', /\S/);
  await expect(figure).toHaveAttribute('aria-describedby', /\S/);
  expect((await figure.innerText()).trim().length).toBeGreaterThan(20);
}

async function expectNoNestedTableScrollers(page: Page, route: DiagramRoute) {
  const problems = await figureFor(page, route).locator('table').evaluateAll((tables) =>
    tables.flatMap((table, index) => {
      const style = getComputedStyle(table);
      return style.display === 'block' || ['auto', 'scroll'].includes(style.overflowX)
        ? [`table ${index} is a nested ${style.display}/${style.overflowX} scroll boundary`]
        : [];
    }),
  );
  expect(problems, route.chapterId).toEqual([]);
}

async function openFullView(page: Page, route: DiagramRoute) {
  const figure = figureFor(page, route);
  const toggle = figure.locator('[data-diagram-full-view-toggle]');
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeVisible();
  await toggle.click();
  await page.waitForFunction(
    (visualizationId) =>
      document.fullscreenElement?.getAttribute('data-visualization-id') ===
      visualizationId,
    route.visualizationId,
  );
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  return { figure, toggle };
}

test.describe('course-wide diagram full view', {
  tag: '@diagram-full-view',
}, () => {
  test('every useful chapter uses the shared desktop enhancement contract', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    expect(diagramRoutes.length).toBeGreaterThanOrEqual(30);
    expect(new Set(diagramRoutes.map(({ visualizationId }) => visualizationId)).size)
      .toBe(diagramRoutes.length);
    await page.setViewportSize(desktop);
    const fallbackProblems: string[] = [];

    for (const route of diagramRoutes) {
      await page.goto(route.path);
      await waitForController(page);
      await expectStaticDiagram(page, route);
      await expectOnlySharedDiagramClientScript(page);
      await expectNoNestedTableScrollers(page, route);

      const metrics = await readMetrics(page, route);
      expect(metrics.controls, route.chapterId).toBe(metrics.shouldEnhance ? 1 : 0);
      fallbackProblems.push(
        ...metrics.unnamedOwners.map((problem) => `${route.chapterId}: ${problem}`),
      );
      if (metrics.controls === 1) {
        const figure = figureFor(page, route);
        const toggle = figure.locator('[data-diagram-full-view-toggle]');
        await expect(figure).toHaveAttribute('id', /^course-diagram-/);
        await expect(toggle).toHaveAttribute('type', 'button');
        await expect(toggle).toHaveAttribute('aria-controls', await figure.getAttribute('id') ?? '');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toHaveAccessibleName('View diagram full screen');
      }
      await expectNoPageOverflow(page);
    }
    expect(fallbackProblems).toEqual([]);
  });

  test('mobile transitions keep the static fallback and remove the control', async ({
    page,
  }) => {
    await page.setViewportSize(mobile);
    await page.goto(chapter30.path);
    await waitForController(page);
    await expectStaticDiagram(page, chapter30);
    await expect(figureFor(page, chapter30).locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
    expect((await readMetrics(page, chapter30)).unnamedOwners).toEqual([]);
    await expectNoPageOverflow(page);

    await page.setViewportSize(desktop);
    await waitForController(page);
    const desktopMetrics = await readMetrics(page, chapter30);
    expect(desktopMetrics.shouldEnhance).toBe(true);
    await expect(figureFor(page, chapter30).locator('[data-diagram-full-view-toggle]')).toHaveCount(1);

    await page.setViewportSize(mobile);
    await waitForController(page);
    await expect(figureFor(page, chapter30).locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
    await expectNoPageOverflow(page);
  });

  test('all diagrams remain complete and usable without JavaScript', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: mobile,
    });
    const page = await context.newPage();
    const fallbackProblems: string[] = [];
    try {
      for (const route of diagramRoutes) {
        await page.goto(route.path);
        await expectStaticDiagram(page, route);
        await expect(page.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
        fallbackProblems.push(
          ...(await readMetrics(page, route)).unnamedOwners.map(
            (problem) => `${route.chapterId}: ${problem}`,
          ),
        );
        await expectNoPageOverflow(page);
      }
      expect(fallbackProblems).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('unsupported fullscreen exposes no nonfunctional control', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        configurable: true,
        value: false,
      });
    });
    await page.setViewportSize(desktop);
    await page.goto(chapter30.path);
    await waitForController(page);
    await expectStaticDiagram(page, chapter30);
    await expect(figureFor(page, chapter30).locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
  });

  test.describe('real fullscreen behavior', () => {
    test.describe.configure({ mode: 'serial' });

    test('Chapter 30 gains reading width, preserves its DOM, and restores focus', async ({
      page,
    }) => {
      await page.setViewportSize(desktop);
      await page.goto(chapter30.path);
      await waitForController(page);
      const before = await readMetrics(page, chapter30);
      expect(before.shouldEnhance).toBe(true);
      await figureFor(page, chapter30).evaluate((figure) => {
        (window as typeof window & { __diagramIdentity?: Element }).__diagramIdentity = figure;
      });
      const inlineToggle = figureFor(page, chapter30).locator(
        '[data-diagram-full-view-toggle]',
      );
      await inlineToggle.scrollIntoViewIfNeeded();
      const pageScrollBefore = await page.evaluate(() => window.scrollY);
      const { figure, toggle } = await openFullView(page, chapter30);
      const after = await readMetrics(page, chapter30);

      expect(
        await figure.evaluate(
          (node) =>
            (window as typeof window & { __diagramIdentity?: Element }).__diagramIdentity === node,
        ),
      ).toBe(true);
      expect(after.fullscreen).toBe(true);
      expect(after.figureWidth).toBeGreaterThanOrEqual(after.innerWidth - 4);
      expect(after.figureWidth - before.figureWidth).toBeGreaterThanOrEqual(
        MINIMUM_FULLSCREEN_GAIN_PX,
      );
      expect(after.staticCounts).toEqual(before.staticCounts);
      expect(after.textFontSize).toBeGreaterThanOrEqual(before.textFontSize - 0.1);
      expect(after.overflowDebt).toBeLessThanOrEqual(before.overflowDebt);
      expect(after.maximumOverflowDebt).toBeLessThanOrEqual(
        Math.max(96, after.innerWidth * 0.25),
      );
      if (before.overflowDebt >= 96) {
        const requiredReduction = Math.min(96, before.overflowDebt * 0.2);
        expect(before.overflowDebt - after.overflowDebt).toBeGreaterThanOrEqual(
          requiredReduction,
        );
      }
      await expect(toggle).toHaveAccessibleName('Exit full screen');
      await expect(toggle).toHaveAttribute('aria-keyshortcuts', 'Escape');

      await figure.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await expect(toggle).toBeInViewport();
      await toggle.click();
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAccessibleName('View diagram full screen');
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - pageScrollBefore))
        .toBeLessThanOrEqual(2);

      await toggle.click();
      await page.waitForFunction(() => document.fullscreenElement !== null);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('every eligible diagram avoids a multi-viewport journey in full view', async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.setViewportSize(desktop);
      const residualProblems: string[] = [];
      let enhancedCount = 0;

      for (const route of diagramRoutes) {
        await page.goto(route.path);
        await waitForController(page);
        const figure = figureFor(page, route);
        const toggle = figure.locator('[data-diagram-full-view-toggle]');
        if ((await toggle.count()) === 0) continue;

        enhancedCount += 1;
        const before = await readMetrics(page, route);
        await openFullView(page, route);
        const after = await readMetrics(page, route);
        const allowedResidual = Math.max(96, after.innerWidth * 0.25);
        if (after.maximumOverflowDebt > allowedResidual) {
          residualProblems.push(
            `${route.chapterId}: ${after.maximumOverflowOwner} retains ${after.maximumOverflowDebt}px (limit ${allowedResidual}px)`,
          );
        }
        if (after.overflowDebt > before.overflowDebt) {
          residualProblems.push(
            `${route.chapterId}: total debt grew from ${before.overflowDebt}px to ${after.overflowDebt}px`,
          );
        }
        await toggle.click();
        await page.waitForFunction(() => document.fullscreenElement === null);
      }

      expect(enhancedCount).toBeGreaterThan(0);
      expect(residualProblems).toEqual([]);
    });

    test('localized controls use whole Russian phrases in both states', async ({
      page,
    }) => {
      await page.setViewportSize(desktop);
      let chosen: DiagramRoute | undefined;
      for (const route of diagramRoutes.filter(({ order }) => order <= 7)) {
        const localized = { ...route, path: `/ru/course/${route.chapterId}/` };
        await page.goto(localized.path);
        await waitForController(page);
        if (await figureFor(page, localized).locator('[data-diagram-full-view-toggle]').count()) {
          chosen = localized;
          break;
        }
      }
      expect(chosen, 'a published Russian diagram must benefit from full view').toBeDefined();
      const route = chosen!;
      const toggle = figureFor(page, route).locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveAccessibleName('Развернуть схему на весь экран');
      await openFullView(page, route);
      await expect(toggle).toHaveAccessibleName('Выйти из полноэкранного режима');
      await toggle.click();
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });

    test('forced colors and synthetic RTL retain a visible usable control', async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.setViewportSize(desktop);
      await page.goto(chapter30.path);
      await waitForController(page);
      await page.locator('html').evaluate((html) => {
        html.setAttribute('dir', 'rtl');
      });
      const figure = figureFor(page, chapter30);
      await figure.evaluate((node) => node.setAttribute('dir', 'rtl'));
      const toggle = figure.locator('[data-diagram-full-view-toggle]');
      await toggle.focus();
      const styles = await toggle.evaluate((button) => {
        const style = getComputedStyle(button);
        return {
          borderStyle: style.borderStyle,
          borderWidth: Number.parseFloat(style.borderWidth),
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
        };
      });
      expect(styles.borderStyle).not.toBe('none');
      expect(styles.borderWidth).toBeGreaterThan(0);
      expect(styles.outlineStyle).not.toBe('none');
      expect(styles.outlineWidth).toBeGreaterThan(0);

      await openFullView(page, chapter30);
      await expect(toggle).toBeInViewport();
      const directions = await figure.evaluate((node) => ({
        control: getComputedStyle(
          node.querySelector<HTMLElement>('[data-diagram-full-view-controls]')!,
        ).direction,
        technical: getComputedStyle(
          node.querySelector<HTMLElement>('[dir="ltr"]')!,
        ).direction,
      }));
      expect(directions.control).toBe('rtl');
      expect(directions.technical).toBe('ltr');
      const fullscreenMetrics = await readMetrics(page, chapter30);
      expect(fullscreenMetrics.documentWidth).toBeLessThanOrEqual(
        fullscreenMetrics.pageWidth + 2,
      );
      expect(fullscreenMetrics.bodyWidth).toBeLessThanOrEqual(
        fullscreenMetrics.pageWidth + 2,
      );
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });
  });
});
