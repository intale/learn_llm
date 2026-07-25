// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { readFileSync, readdirSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { parseJsonFrontmatter } from '../../../scripts/check-site-content.mjs';

declare const process: { cwd(): string };

interface DiagramRoute {
  chapterId: string;
  locale: 'en' | 'ru';
  order: number;
  path: string;
  visualizationId: string;
}

interface DiagramAudit {
  errors: string[];
  signatures: {
    caption: string;
    card: string | null;
    root: string;
    scroll: string | null;
    section: string | null;
    table: string | null;
  };
}

const desktop = { width: 1280, height: 900 } as const;
const medium = { width: 1024, height: 768 } as const;
const mobile = { width: 390, height: 844 } as const;
const tolerance = 2;
const englishChapterDirectory = resolve(process.cwd(), 'src/content/chapters/en');

const englishRoutes = (readdirSync(englishChapterDirectory) as string[])
  .filter((name: string) => name.endsWith('.mdx'))
  .flatMap((name: string): DiagramRoute[] => {
    const source = readFileSync(resolve(englishChapterDirectory, name), 'utf8');
    const { data } = parseJsonFrontmatter(source, name);
    if (data.visualization.decision !== 'useful') return [];
    return [{
      chapterId: data.chapter_id as string,
      locale: 'en',
      order: data.order as number,
      path: `/en/course/${data.chapter_id}/`,
      visualizationId: data.visualization.id as string,
    }];
  })
  .sort((left, right) => left.order - right.order);

const routes: DiagramRoute[] = [
  ...englishRoutes,
  ...englishRoutes
    .filter(({ order }) => order <= 7)
    .map((route) => ({
      ...route,
      locale: 'ru' as const,
      path: `/ru/course/${route.chapterId}/`,
    })),
];

function figureFor(page: Page, route: DiagramRoute): Locator {
  return page.locator(
    `figure[data-visualization-id="${route.visualizationId}"]`,
  );
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function auditFigure(page: Page, route: DiagramRoute): Promise<DiagramAudit> {
  return figureFor(page, route).evaluate((figure, allowedError) => {
    const root = figure as HTMLElement;
    const errors: string[] = [];
    const visible = (element: Element) => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      return (
        node.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    };
    const label = (element: Element) => {
      const direct = element.getAttribute('aria-label')?.trim();
      if (direct) return direct;
      return (element.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
    };
    const describe = (element: Element) => {
      const node = element as HTMLElement;
      const classes = typeof node.className === 'string'
        ? node.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const inlineDebt = (element: Element) => {
      const node = element as HTMLElement;
      return Math.max(0, node.scrollWidth - node.clientWidth);
    };
    const insideSanctionedScroll = (element: Element) =>
      element.closest('[data-diagram-scroll]') !== null;
    const insideMathViewport = (element: Element) =>
      element.closest('.katex, .katex-display') !== null;

    if (root.firstElementChild?.tagName !== 'FIGCAPTION') {
      errors.push('figcaption is not the first element child');
    }
    const caption = root.firstElementChild as HTMLElement | null;
    if (!caption?.classList.contains('course-diagram__caption')) {
      errors.push('caption does not use the shared role');
    }
    if (!caption?.querySelector('h3, .visually-hidden + h3')) {
      errors.push('caption has no title heading');
    }
    if (!caption?.querySelector('.course-diagram__description')) {
      errors.push('caption has no shared learner description');
    }
    if (getComputedStyle(root).getPropertyValue('--course-diagram-style-version').trim() !== 'course-v1') {
      errors.push('shared module version is not applied');
    }

    const scrollRegions = [...root.querySelectorAll<HTMLElement>('[data-diagram-scroll]')];
    for (const region of scrollRegions) {
      const style = getComputedStyle(region);
      const rect = region.getBoundingClientRect();
      const owner = region.parentElement?.closest<HTMLElement>(
        '[data-diagram-box], section, figure.course-diagram',
      );
      const ownerRect = owner?.getBoundingClientRect();
      if (!region.classList.contains('course-diagram__scroll')) {
        errors.push(`${describe(region)} lacks the shared scroll class`);
      }
      if (region.getAttribute('role') !== 'region' || region.getAttribute('tabindex') !== '0') {
        errors.push(`${describe(region)} is not a keyboard region`);
      }
      if (!label(region)) errors.push(`${describe(region)} has no accessible name`);
      if (!['auto', 'scroll'].includes(style.overflowX)) {
        errors.push(`${describe(region)} does not own horizontal overflow`);
      }
      if (
        ownerRect &&
        (rect.left < ownerRect.left - allowedError || rect.right > ownerRect.right + allowedError)
      ) {
        errors.push(`${describe(region)} escapes its semantic box`);
      }
    }

    const all = [root, ...root.querySelectorAll<HTMLElement>('*')].filter(
      (element) => visible(element) && !element.closest('.visually-hidden'),
    );
    for (const element of all) {
      const style = getComputedStyle(element);
      const isStructuralBox =
        element === root ||
        element.parentElement === root && element.tagName === 'SECTION' ||
        element.parentElement?.tagName === 'DL' &&
          element.parentElement.parentElement === root ||
        element.hasAttribute('data-diagram-box') ||
        ['TH', 'TD'].includes(element.tagName);
      if (
        isStructuralBox &&
        [style.overflowX, style.overflowY].some((overflow) =>
          ['hidden', 'clip'].includes(overflow)
        )
      ) {
        errors.push(`${describe(element)} hides or clips overflow`);
      }

      if (
        element.classList.contains('state-symbol') &&
        (inlineDebt(element) > allowedError ||
          element.scrollHeight > element.clientHeight + allowedError)
      ) {
        errors.push(`${describe(element)} cannot contain its complete state label`);
      }

      if (!isStructuralBox) continue;
      const debt = inlineDebt(element);
      if (debt <= allowedError || insideMathViewport(element)) continue;
      if (element.hasAttribute('data-diagram-scroll')) continue;
      if (insideSanctionedScroll(element) && !['TH', 'TD'].includes(element.tagName)) continue;
      errors.push(`${describe(element)} has ${debt}px unowned inline overflow`);
    }

    const boxSelector = '[data-diagram-box], figure.course-diagram > dl > div, th, td';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const parent = textNode.parentElement;
      const text = textNode.textContent?.trim() ?? '';
      if (
        parent &&
        text &&
        visible(parent) &&
        !insideSanctionedScroll(parent) &&
        !parent.closest('.katex-mathml, .visually-hidden, [aria-hidden="true"]')
      ) {
        let box = parent.closest<HTMLElement>(boxSelector);
        if (!box && !insideMathViewport(parent)) {
          box = parent.closest<HTMLElement>('section, figure.course-diagram');
        }
        if (box) {
          const boxRect = box.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of range.getClientRects()) {
            if (
              rect.width > 0 &&
              (rect.left < boxRect.left - allowedError || rect.right > boxRect.right + allowedError)
            ) {
              errors.push(
                `${describe(parent)} paints text outside ${describe(box)} by ` +
                `${Math.max(boxRect.left - rect.left, rect.right - boxRect.right).toFixed(1)}px`,
              );
              break;
            }
          }
        }
      }
      textNode = walker.nextNode();
    }

    const signature = (element: Element | null, properties: string[]) => {
      if (!element) return null;
      const style = getComputedStyle(element);
      return JSON.stringify(Object.fromEntries(properties.map((property) => [
        property,
        style.getPropertyValue(property),
      ])));
    };
    const firstCard = root.querySelector('[data-diagram-card][data-diagram-box]');
    const firstSection = root.querySelector(':scope > section');
    const firstTable = root.querySelector('table[data-diagram-table]');
    const firstScroll = root.querySelector('[data-diagram-scroll]');

    return {
      errors: [...new Set(errors)],
      signatures: {
        root: signature(root, [
          'display', 'margin-inline-start', 'margin-inline-end', 'padding-inline-start',
          'border-top-width', 'border-top-style', 'border-radius', 'background-color',
          'box-shadow', 'color', 'font-size', 'line-height',
        ])!,
        caption: signature(caption, [
          'display', 'padding-inline-start', 'font-family', 'font-size', 'line-height', 'color',
        ])!,
        section: signature(firstSection, [
          'padding-inline-start', 'border-top-width', 'border-radius', 'background-color', 'color',
        ]),
        card: signature(firstCard, [
          'padding-inline-start', 'border-radius', 'border-top-color', 'background-color', 'color',
        ]),
        table: signature(firstTable, [
          'border-collapse', 'background-color', 'color', 'font-size', 'line-height',
        ]),
        scroll: signature(firstScroll, [
          'overflow-x', 'max-inline-size', 'border-radius', 'outline-offset',
        ]),
      },
    };
  }, tolerance);
}

async function auditRoutes(
  page: Page,
  viewport: { width: number; height: number },
  selectedRoutes = routes,
) {
  await page.setViewportSize(viewport);
  const failures: string[] = [];
  const baselines = new Map<keyof DiagramAudit['signatures'], string>();

  for (const route of selectedRoutes) {
    await page.goto(route.path);
    await settle(page);
    const figure = figureFor(page, route);
    await expect(figure).toHaveAttribute('class', /\bcourse-diagram\b/);
    await expect(figure).toHaveAttribute('data-diagram-style', 'course-v1');
    const pageWidths = await page.evaluate((allowedError) => {
      const viewport = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((element) => {
          if (element.closest('[data-diagram-scroll]')) return false;
          const style = getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = element.getBoundingClientRect();
          return rect.left < -allowedError || rect.right > viewport + allowedError;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const classes = typeof element.className === 'string'
            ? element.className.trim().split(/\s+/).slice(0, 2).join('.')
            : '';
          return {
            debt: Math.max(-rect.left, rect.right - viewport),
            label: `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`,
          };
        })
        .sort((left, right) => right.debt - left.debt)
        .slice(0, 3)
        .map(({ debt, label }) => `${label} (${debt.toFixed(1)}px)`);
      return {
        body: document.body.scrollWidth,
        document: document.documentElement.scrollWidth,
        offenders,
        viewport,
      };
    }, tolerance);
    if (
      pageWidths.body > pageWidths.viewport + tolerance ||
      pageWidths.document > pageWidths.viewport + tolerance
    ) {
      failures.push(
        `${route.locale}/${route.chapterId}: page width ` +
        `${Math.max(pageWidths.body, pageWidths.document)}px exceeds ` +
        `${pageWidths.viewport}px viewport; offenders: ${pageWidths.offenders.join(', ')}`,
      );
    }
    const audit = await auditFigure(page, route);
    failures.push(...audit.errors.map((error) => `${route.locale}/${route.chapterId}: ${error}`));

    for (const [kind, value] of Object.entries(audit.signatures) as Array<
      [keyof DiagramAudit['signatures'], string | null]
    >) {
      if (!value) continue;
      const baseline = baselines.get(kind);
      if (!baseline) baselines.set(kind, value);
      else if (baseline !== value) {
        failures.push(`${route.locale}/${route.chapterId}: ${kind} style differs from shared baseline`);
      }
    }
  }

  expect(failures).toEqual([]);
}

test.describe('course diagram style system', { tag: '@diagram-style' }, () => {
  test('all published diagrams share one contained desktop presentation', async ({ page }) => {
    test.setTimeout(240_000);
    expect(englishRoutes).toHaveLength(30);
    expect(routes).toHaveLength(37);
    await auditRoutes(page, desktop);
  });

  test('all published diagrams remain contained in the narrow fallback', async ({ page }) => {
    test.setTimeout(240_000);
    await auditRoutes(page, mobile);
  });

  test('Chapters 12 and 13 contain every cell, card, and text fragment', async ({ page }) => {
    test.setTimeout(90_000);
    const focused = englishRoutes.filter(({ order }) => order === 12 || order === 13);
    expect(focused).toHaveLength(2);
    await auditRoutes(page, medium, focused);
  });

  test('the shared system remains legible and contained in forced colors', async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ forcedColors: 'active' });
    const focused = englishRoutes.filter(({ order }) => order === 12 || order === 13);
    await auditRoutes(page, desktop, focused);
    for (const route of focused) {
      await page.goto(route.path);
      await settle(page);
      const colors = await figureFor(page, route).evaluate((figure) => {
        const style = getComputedStyle(figure);
        return {
          background: style.backgroundColor,
          border: style.borderTopColor,
          color: style.color,
        };
      });
      expect(colors.border).toBe(colors.color);
    }
  });
});
