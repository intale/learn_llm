// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  chapterLocaleDefinitions,
  expectNoPageOverflow,
  readOrderedCourseChapters,
} from './chapter-helpers';

const storageKey = 'learn-llm-color-theme';
const labels: Readonly<Record<string, string>> = Object.fromEntries(
  chapterLocaleDefinitions.map(({ code }) => {
    const catalog = JSON.parse(
      readFileSync(
        new URL(`../../src/i18n/catalogs/${code}.json`, import.meta.url),
        'utf8',
      ),
    ) as { darkThemeLabel?: unknown };
    if (
      typeof catalog.darkThemeLabel !== 'string' ||
      catalog.darkThemeLabel.trim().length === 0
    ) {
      throw new Error(`Message catalog ${code}.darkThemeLabel must be non-empty.`);
    }
    return [code, catalog.darkThemeLabel];
  }),
);

async function settleLayout(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

function parseColor(value: string) {
  const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
  expect(channels.length, `expected an RGB color, received ${value}`).toBeGreaterThanOrEqual(3);
  return [channels[0], channels[1], channels[2], channels[3] ?? 1] as const;
}

function effectiveBackground(backgrounds: readonly string[]) {
  let result = [0, 0, 0, 0] as [number, number, number, number];
  for (const background of backgrounds) {
    const layer = parseColor(background);
    const alpha = result[3] + layer[3] * (1 - result[3]);
    if (alpha === 0) continue;
    result = [
      (result[0] * result[3] + layer[0] * layer[3] * (1 - result[3])) / alpha,
      (result[1] * result[3] + layer[1] * layer[3] * (1 - result[3])) / alpha,
      (result[2] * result[3] + layer[2] * layer[3] * (1 - result[3])) / alpha,
      alpha,
    ];
    if (alpha >= 0.999) break;
  }
  expect(result[3], 'surface must resolve to an opaque page background').toBeGreaterThanOrEqual(0.999);
  return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
}

function relativeLuminance(value: string) {
  const channels = parseColor(value).slice(0, 3).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

async function expectReadableSurface(locator: Locator, minimum = 4.5) {
  const colors = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const backgrounds: string[] = [];
    let current: Element | null = element;
    while (current) {
      backgrounds.push(getComputedStyle(current).backgroundColor);
      current = current.parentElement;
    }
    return {
      backgrounds,
      foreground: style.color,
    };
  });
  const background = effectiveBackground(colors.backgrounds);
  expect(
    contrastRatio(colors.foreground, background),
    `${colors.foreground} on ${background}`,
  ).toBeGreaterThanOrEqual(minimum);
}

async function contentFingerprint(page: Page) {
  return page.evaluate(() => ({
    anchors: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .map((anchor) => anchor.getAttribute('href')),
    figures: Array.from(
      document.querySelectorAll<HTMLElement>('[data-visualization-id]'),
    ).map((figure) => figure.dataset.visualizationId),
    formulas: Array.from(
      document.querySelectorAll('annotation[encoding="application/x-tex"]'),
    ).map((annotation) => annotation.textContent),
    main: document.querySelector('main')?.textContent,
    alternates: Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"]'),
    ).map((link) => `${link.hreflang}:${link.getAttribute('href')}`),
  }));
}

for (const locale of chapterLocaleDefinitions) {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'narrow', width: 360, height: 720 },
  ]) {
    test(`${locale.code} ${viewport.name} header toggle is localized, keyboard-safe, and visual-only @theme`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(`/${locale.code}/`);

      const root = page.locator('html');
      const toggle = page.getByRole('button', { name: labels[locale.code] });
      await expect(root).toHaveAttribute('data-theme', 'light');
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('type', 'button');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(toggle.locator('.theme-toggle__state')).toBeHidden();
      expect(await toggle.getAttribute('href')).toBeNull();
      expect(await toggle.getAttribute('rel')).toBeNull();
      await expect(page.locator('a[data-theme-toggle], link[data-theme-toggle]')).toHaveCount(0);

      const originalUrl = page.url();
      const originalContent = await contentFingerprint(page);
      const lightColors = await root.evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, foreground: style.color };
      });

      await toggle.focus();
      await page.keyboard.press('Space');
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(toggle.locator('.theme-toggle__state')).toBeVisible();
      await expect(root).toHaveAttribute('data-theme', 'dark');
      expect(page.url()).toBe(originalUrl);
      expect(await contentFingerprint(page)).toEqual(originalContent);
      expect(
        await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
      ).toBe('dark');

      const darkColors = await root.evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, foreground: style.color };
      });
      expect(darkColors).not.toEqual(lightColors);
      expect(contrastRatio(darkColors.foreground, darkColors.background)).toBeGreaterThanOrEqual(7);
      await expectNoPageOverflow(page);

      await page.reload();
      const reloadedToggle = page.getByRole('button', { name: labels[locale.code] });
      await expect(root).toHaveAttribute('data-theme', 'dark');
      await expect(reloadedToggle).toHaveAttribute('aria-pressed', 'true');
      await reloadedToggle.focus();
      await page.keyboard.press('Enter');
      await expect(reloadedToggle).toBeFocused();
      await expect(root).toHaveAttribute('data-theme', 'light');
      await expect(reloadedToggle.locator('.theme-toggle__state')).toBeHidden();
      expect(
        await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
      ).toBe('light');
      expect(page.url()).toBe(originalUrl);
    });
  }
}

test('the control safely wraps a future long RTL label @theme', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await page.goto('/en/');
  const toggle = page.locator('button[data-theme-toggle]');
  await toggle.evaluate((button) => {
    document.documentElement.dir = 'rtl';
    const label = button.querySelector<HTMLElement>('.theme-toggle__label');
    if (!label) throw new Error('Theme toggle label is missing.');
    label.textContent = 'سمة داكنة اختيارية للنصوص التعليمية الطويلة';
  });
  await settleLayout(page);

  const geometry = await toggle.evaluate((button) => {
    const label = button.querySelector<HTMLElement>('.theme-toggle__label');
    if (!label) throw new Error('Theme toggle label is missing.');
    const buttonRect = button.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    return {
      buttonDebt: button.scrollWidth - button.clientWidth,
      labelInside:
        labelRect.left >= buttonRect.left - 1 &&
        labelRect.right <= buttonRect.right + 1 &&
        labelRect.top >= buttonRect.top - 1 &&
        labelRect.bottom <= buttonRect.bottom + 1,
    };
  });
  expect(geometry.buttonDebt).toBeLessThanOrEqual(1);
  expect(geometry.labelInside).toBe(true);
  await expectNoPageOverflow(page);
});

test('the synchronous bootstrap precedes styles and body on every shell @theme', async ({
  request,
}) => {
  for (const path of ['/', ...chapterLocaleDefinitions.map(({ code }) => `/${code}/`)]) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    const html = await response.text();
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
    expect(head, path).not.toBe('');
    expect(head.match(/data-theme-bootstrap/g), path).toHaveLength(1);
    const bootstrapIndex = head.indexOf('data-theme-bootstrap');
    const stylesheetIndex = head.indexOf('rel="stylesheet"');
    expect(bootstrapIndex, path).toBeGreaterThanOrEqual(0);
    expect(stylesheetIndex, path).toBeGreaterThanOrEqual(0);
    expect(bootstrapIndex, path).toBeLessThan(stylesheetIndex);
    expect(html.indexOf('<body'), path).toBeGreaterThan(bootstrapIndex);
  }
});

test('explicit preference survives routes, locales, and the root chooser without creating crawl targets @theme', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/en/');
  await page.getByRole('button', { name: labels.en }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.locator('a.course-cta').click();
  await expect(page).toHaveURL(/\/en\/course\/$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: labels.en })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.locator('.locale-switch a[data-locale="ru"]').click();
  await expect(page).toHaveURL(/\/ru\/course\/$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: labels.ru })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('[data-theme-toggle]')).toHaveCount(0);
  await expect(
    page.locator(
      'a[href*="theme="], a[href*="theme%3D"], link[href*="theme="], link[href*="theme%3D"]',
    ),
  ).toHaveCount(0);
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
  ).toBe('dark');
});

test('the root chooser follows live system changes until a choice exists @theme', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const root = page.locator('html');
  expect(await root.getAttribute('data-theme')).toBeNull();
  const darkBackground = await root.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  await page.emulateMedia({ colorScheme: 'light' });
  await expect
    .poll(() =>
      root.evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(darkBackground);
  expect(await root.getAttribute('data-theme')).toBeNull();
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
  ).toBeNull();
});

test('system preference remains live until the visitor makes an explicit choice @theme', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/en/');
  const root = page.locator('html');
  const toggle = page.getByRole('button', { name: labels.en });
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
  ).toBeNull();

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
  ).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveAttribute('data-theme', 'dark');
});

test('an invalid stored value falls back safely @theme', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(
    ({ key }) => window.localStorage.setItem(key, 'sepia'),
    { key: storageKey },
  );
  await page.goto('/en/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: labels.en })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(errors).toEqual([]);
});

test('unavailable storage keeps a safe session-only switch @theme', async ({
  page,
}) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', {
      configurable: true,
      value() {
        throw new DOMException('Storage is unavailable', 'SecurityError');
      },
    });
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value() {
        throw new DOMException('Storage is unavailable', 'SecurityError');
      },
    });
  });
  await page.goto('/en/');
  const originalUrl = page.url();
  const toggle = page.getByRole('button', { name: labels.en });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(page.url()).toBe(originalUrl);
  expect(errors).toEqual([]);
});

test('another tab can update or clear the explicit preference @theme', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, colorScheme: 'light' });
  const firstPage = await context.newPage();
  const secondPage = await context.newPage();
  await firstPage.goto('/en/');
  await secondPage.goto('/en/');

  await firstPage.getByRole('button', { name: labels.en }).click();
  await expect(secondPage.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(secondPage.getByRole('button', { name: labels.en })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await firstPage.evaluate(() => window.localStorage.clear());
  await expect(secondPage.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(secondPage.getByRole('button', { name: labels.en })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await context.close();
});


test('dark mode keeps representative prose, code, dialog, formula, and full-view diagram surfaces readable @theme', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(
    ({ key }) => window.localStorage.setItem(key, 'dark'),
    { key: storageKey },
  );
  await page.goto('/en/course/22-adamw/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await expectReadableSurface(page.locator('html'), 7);
  await expectReadableSurface(page.locator('.lesson-objective'));
  await expectReadableSurface(page.locator('.rust-source').first());
  await expectReadableSurface(page.locator('figure.course-diagram').first());
  await expectReadableSurface(
    page.locator('figure.course-diagram > section').first(),
  );
  await expectReadableSurface(
    page.locator('figure.course-diagram [data-diagram-card]').first(),
  );

  const formulaColor = await page.locator('.katex').first().evaluate((element) =>
    getComputedStyle(element).color,
  );
  const pageBackground = await page.locator('html').evaluate((element) =>
    getComputedStyle(element).backgroundColor,
  );
  expect(contrastRatio(formulaColor, pageBackground)).toBeGreaterThanOrEqual(7);

  await page.locator('[data-cheat-sheet-open]').click();
  const dialog = page.locator('[data-cheat-sheet-dialog]');
  await expect(dialog).toBeVisible();
  await expectReadableSurface(dialog, 7);
  await dialog.locator('[data-cheat-sheet-close]').click();

  const figure = page.locator('figure.course-diagram').first();
  const fullView = figure.locator('[data-diagram-full-view-toggle]');
  await expect(fullView).toBeVisible();
  await fullView.click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await expectReadableSurface(figure);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expectNoPageOverflow(page);
});

test('chapter 12 full view preserves useful evidence widths in every locale @theme', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(
    ({ key }) => window.localStorage.setItem(key, 'dark'),
    { key: storageKey },
  );

  for (const { code } of chapterLocaleDefinitions) {
    await page.goto(`/${code}/course/12-stable-softmax/`);
    await settleLayout(page);
    const figure = page.locator(
      'figure[data-visualization-id="stable-softmax"]',
    );
    await figure.locator('[data-diagram-full-view-toggle]').click();
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(true);
    await settleLayout(page);

    const geometry = await figure.evaluate((node) => {
      const invariance = node.querySelector<HTMLElement>('.invariance-note');
      const denominator = invariance?.lastElementChild;
      const cards = Array.from(
        node.querySelectorAll<HTMLElement>('.error-grid > .error-card'),
      );
      if (!invariance || !denominator || cards.length !== 4) {
        throw new Error('Stable-softmax fullscreen evidence is incomplete.');
      }
      const denominatorPartLines = Array.from(denominator.children).map(
        (part) => {
          const range = document.createRange();
          range.selectNodeContents(part);
          return new Set(
            Array.from(range.getClientRects()).map(({ top }) => Math.round(top)),
          ).size;
        },
      );
      const cardRects = cards.map((card) => card.getBoundingClientRect());
      return {
        denominatorMaximumPartLines: Math.max(...denominatorPartLines),
        errorCardMinimumWidth: Math.min(...cardRects.map(({ width }) => width)),
        errorRows: new Set(cardRects.map(({ top }) => Math.round(top))).size,
        invarianceWidth: invariance.getBoundingClientRect().width,
      };
    });
    expect(geometry.invarianceWidth, code).toBeGreaterThan(180);
    expect(geometry.denominatorMaximumPartLines, code).toBe(1);
    expect(geometry.errorCardMinimumWidth, code).toBeGreaterThan(200);
    expect(geometry.errorRows, code).toBe(2);

    await page.keyboard.press('Escape');
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(false);
  }
});

test('all registered diagrams consume readable shared dark surfaces @theme @theme-diagrams', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(
    ({ key }) => window.localStorage.setItem(key, 'dark'),
    { key: storageKey },
  );
  const chapters = await readOrderedCourseChapters(page, 'en', {
    includeIntroduction: true,
  });
  expect(chapters).toHaveLength(40);

  let figureCount = 0;
  for (const chapter of chapters) {
    await page.goto(chapter.href);
    await settleLayout(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const figures = page.locator('figure[data-visualization-id]');
    const count = await figures.count();
    figureCount += count;
    for (let index = 0; index < count; index += 1) {
      const figure = figures.nth(index);
      await expectReadableSurface(figure);
      const sections = figure.locator(':scope > section');
      for (let sectionIndex = 0; sectionIndex < await sections.count(); sectionIndex += 1) {
        await expectReadableSurface(sections.nth(sectionIndex));
      }
    }
    await expectNoPageOverflow(page);
  }
  expect(figureCount).toBe(42);
});

test('forced colors retains a visible, focused native toggle @theme', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
  await page.goto('/ru/');
  const toggle = page.getByRole('button', { name: labels.ru });
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle.locator('.theme-toggle__state')).toBeVisible();
  await expect(toggle).toHaveCSS('forced-color-adjust', 'auto');
  const focusChrome = await toggle.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      borderStyle: style.borderTopStyle,
      borderWidth: Number.parseFloat(style.borderTopWidth),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusChrome.borderStyle).not.toBe('none');
  expect(focusChrome.borderWidth).toBeGreaterThan(0);
  expect(focusChrome.outlineStyle).not.toBe('none');
  expect(focusChrome.outlineWidth).toBeGreaterThan(0);
  await expectNoPageOverflow(page);
});
