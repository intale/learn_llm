import { expect, type Locator, type Page } from '@playwright/test';

import localeManifest from '../../src/i18n/locales.json' with { type: 'json' };

export type ChapterLocale = keyof typeof localeManifest.locales;
export const chapterLocales = Object.freeze(
  Object.keys(localeManifest.locales) as ChapterLocale[],
);
export const chapterLocaleDefinitions = Object.freeze(
  chapterLocales.map((code) => ({ code, ...localeManifest.locales[code] })),
);

const googleAnalyticsMeasurementId = 'G-B5JVTL721S';
const googleAnalyticsCookieDomain = 'intale.github.io';
const googleAnalyticsScriptUrl =
  'https://www.googletagmanager.com/gtag/js?id=' +
  googleAnalyticsMeasurementId;

function normalizeInlineScript(source: string) {
  return source
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n');
}

export interface CourseChapterLink {
  chapterId: string;
  href: string;
  order: number;
  title: string;
}

interface LocalizedChapterRoute {
  chapterId: string;
  locale: ChapterLocale;
  order: number;
  revision: number;
  revisionLabel: string;
  title: string;
  equivalentLocales?: readonly ChapterLocale[];
  fallbackRouteSuffix?: string;
}

interface ReadOrderedCourseChapterOptions {
  includeIntroduction?: boolean;
  origin?: string;
  requireContiguousPrefix?: boolean;
}

export function chapterTag(chapterId: string) {
  return `@chapter:${chapterId}`;
}

export function chapterPath(locale: ChapterLocale, chapterId: string) {
  return `/${locale}/course/${chapterId}/`;
}

export async function readMathAwareText(locator: Locator) {
  return locator.evaluateAll((nodes) =>
    nodes
      .map((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.katex').forEach((math) => {
          const source =
            math.querySelector('annotation[encoding="application/x-tex"]')
              ?.textContent ?? '';
          math.replaceWith(document.createTextNode(source));
        });
        return clone.textContent ?? '';
      })
      .join(' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

export async function expectSeoDescription(page: Page, expected: string) {
  expect(expected).toBe(expected.trim());
  expect(expected.length, 'SEO description must not be empty').toBeGreaterThan(0);

  const descriptions = page.locator('head meta[name="description"]');
  await expect(descriptions).toHaveCount(1);
  await expect(descriptions).toHaveAttribute('content', expected);

  const content = await descriptions.getAttribute('content');
  expect(content).toBe(content?.trim());
  expect(content?.length ?? 0, 'SEO description must not be empty').toBeGreaterThan(0);
}

export async function readOrderedCourseChapters(
  page: Page,
  locale: ChapterLocale,
  {
    includeIntroduction = false,
    origin,
    requireContiguousPrefix,
  }: ReadOrderedCourseChapterOptions = {},
): Promise<CourseChapterLink[]> {
  const coursePath = `/${locale}/course/`;
  const expectsContiguousPrefix =
    requireContiguousPrefix ?? locale === localeManifest.defaultLocale;
  await page.goto(origin ? new URL(coursePath, origin).href : coursePath);
  const items = page.locator('.course-list > li');
  const count = await items.count();
  expect(
    count,
    `${locale} course index must contain a published chapter`,
  ).toBeGreaterThan(0);

  const chapters = await items.evaluateAll((nodes) =>
    nodes.map((node) => {
      const orderText =
        node.querySelector('.feature-number')?.textContent?.trim() ?? '';
      const link = node.querySelector<HTMLAnchorElement>('h2 a');
      return {
        order: Number(orderText),
        title: link?.textContent?.trim() ?? '',
        href: link?.getAttribute('href') ?? '',
      };
    }),
  );

  const firstOrder = chapters[0]?.order;
  expect(firstOrder === 0 || firstOrder === 1).toBe(true);
  const validated = chapters.map((chapter, index) => {
    const previousOrder = chapters[index - 1]?.order ?? Number(firstOrder) - 1;
    const expectedOrder = expectsContiguousPrefix
      ? Number(firstOrder) + index
      : chapter.order;
    const match = chapter.href.match(
      new RegExp(`^/${locale}/course/(\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*)/$`),
    );
    expect(Number.isInteger(chapter.order) && chapter.order > previousOrder).toBe(
      true,
    );
    expect(chapter.order).toBe(expectedOrder);
    expect(
      match,
      `invalid ${locale} chapter href ${chapter.href}`,
    ).not.toBeNull();
    expect(
      match?.[1].startsWith(String(chapter.order).padStart(2, '0') + '-'),
    ).toBe(true);
    expect(chapter.title.length).toBeGreaterThan(0);
    return {
      ...chapter,
      chapterId: match?.[1] ?? '',
    };
  });
  return includeIntroduction
    ? validated
    : validated.filter((chapter) => chapter.order !== 0);
}

export async function expectLocalizedChapterRoute(
  page: Page,
  chapter: LocalizedChapterRoute,
) {
  const definition = chapterLocaleDefinitions.find(
    ({ code }) => code === chapter.locale,
  );
  expect(definition).toBeDefined();
  const currentPath = chapterPath(chapter.locale, chapter.chapterId);

  await expect(page).toHaveURL(new RegExp(`${currentPath}$`));
  await expect(page.locator('html')).toHaveAttribute(
    'lang',
    definition?.languageTag ?? '',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'dir',
    definition?.direction ?? '',
  );
  await expect(
    page.getByRole('heading', { level: 1, name: chapter.title }),
  ).toBeVisible();
  await expect(page.locator('.eyebrow')).toContainText(
    `${String(chapter.order).padStart(2, '0')} · ${chapter.revisionLabel} ${chapter.revision}`,
  );
  const lessonDescription = page.locator('.lesson-description');
  await expect(lessonDescription).toBeVisible();
  await expectSeoDescription(page, (await lessonDescription.innerText()).trim());
  const equivalentLocales = chapter.equivalentLocales ?? chapterLocales;
  expect(new Set(equivalentLocales).size).toBe(equivalentLocales.length);
  expect(equivalentLocales).toContain(chapter.locale);
  for (const alternate of chapterLocaleDefinitions) {
    const hasEquivalentRoute = equivalentLocales.includes(alternate.code);
    const equivalentPath = chapterPath(alternate.code, chapter.chapterId);
    const alternateLink = page.locator(
      `link[rel="alternate"][hreflang="${alternate.languageTag}"]`,
    );
    if (hasEquivalentRoute) {
      await expect(alternateLink).toHaveCount(1);
      await expect(alternateLink).toHaveAttribute('href', equivalentPath);
    } else {
      await expect(alternateLink).toHaveCount(0);
    }
    const switchLink = page.locator(
      `.locale-switch a[data-locale="${alternate.code}"]`,
    );
    if (alternate.code === chapter.locale) {
      await expect(switchLink).toHaveCount(0);
    } else {
      const expectedPath = hasEquivalentRoute
        ? equivalentPath
        : chapter.fallbackRouteSuffix
          ? `/${alternate.code}${chapter.fallbackRouteSuffix}`
          : null;
      expect(
        expectedPath,
        `${alternate.code} requires an equivalent route or an explicit fallback`,
      ).not.toBeNull();
      await expect(switchLink).toHaveCount(1);
      await expect(switchLink).toHaveAttribute('href', expectedPath ?? '');
      await expect(switchLink).toContainText(alternate.nativeName);
      if (hasEquivalentRoute) {
        expect(await switchLink.getAttribute('data-locale-fallback')).toBeNull();
      } else {
        await expect(switchLink).toHaveAttribute(
          'data-locale-fallback',
          'course-index',
        );
      }
    }
  }
  await expect(
    page.locator('link[rel="alternate"][hreflang="x-default"]'),
  ).toHaveAttribute('href', '/');
}

export async function expectOrderedChapterNavigation(
  page: Page,
  locale: ChapterLocale,
  currentChapterId: string,
  chapters: readonly CourseChapterLink[],
) {
  const currentIndex = chapters.findIndex(
    (chapter) => chapter.chapterId === currentChapterId,
  );
  expect(
    currentIndex,
    `${currentChapterId} must appear in the course index`,
  ).toBeGreaterThanOrEqual(0);
  const previous = chapters[currentIndex - 1] ?? null;
  const next = chapters[currentIndex + 1] ?? null;
  const navigation = page.locator('nav[data-chapter-navigation]');
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveAttribute('aria-label', /.+/);
  await expect(
    navigation.locator('a[href="/' + locale + '/course/"]'),
  ).toHaveCount(1);

  for (const [direction, expected, relation] of [
    ['previous', previous, 'prev'],
    ['next', next, 'next'],
  ] as const) {
    const link = navigation.locator(`a[data-chapter-direction="${direction}"]`);
    if (expected === null) {
      await expect(link).toHaveCount(0);
      continue;
    }
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', expected.href);
    await expect(link).toHaveAttribute('rel', relation);
    await expect(link).toHaveAttribute('data-chapter-id', expected.chapterId);
    await expect(link).toHaveAttribute(
      'data-chapter-order',
      String(expected.order),
    );
    await expect(link).toContainText(expected.title);
  }
}

export async function expectVisualizationDecision(
  page: Page,
  visualization:
    {
      decision: 'useful';
      id: string;
      supplementary?: readonly { id: string }[];
    } | { decision: 'not-useful'; id: null },
) {
  const figures = page.locator('figure[data-visualization-id]');
  if (visualization.decision === 'not-useful') {
    await expect(figures).toHaveCount(0);
    return;
  }

  const registrations = [
    visualization.id,
    ...(visualization.supplementary ?? []).map(({ id }) => id),
  ];
  await expect(figures).toHaveCount(registrations.length);
  for (const visualizationId of registrations) {
    const figure = page.locator(
      `figure[data-visualization-id="${visualizationId}"]`,
    );
    await expect(figure).toHaveCount(1);
    await expect(figure).toBeVisible();
    await expect(figure.locator('figcaption')).not.toHaveText('');
    await expect(figure).toHaveAttribute('tabindex', '0');
    const labelledBy = await figure.getAttribute('aria-labelledby');
    const describedBy = await figure.getAttribute('aria-describedby');
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
    for (const id of `${labelledBy} ${describedBy}`.trim().split(/\s+/)) {
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
    await figure.focus();
    await expect(figure).toBeFocused();
  }
}

export async function expectNoPageOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
}

export async function expectOnlySharedDiagramClientScript(page: Page) {
  const labels = await page.locator('html').evaluate((root) => ({
    open: root.getAttribute('data-diagram-full-view-open'),
    close: root.getAttribute('data-diagram-full-view-close'),
  }));
  const hasSharedShell = labels.open !== null || labels.close !== null;
  expect(Boolean(labels.open?.trim())).toBe(hasSharedShell);
  expect(Boolean(labels.close?.trim())).toBe(hasSharedShell);

  const scripts = await page
    .locator('script:not([type="application/ld+json"])')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        src: (node as HTMLScriptElement).src,
        text: node.textContent?.trim() ?? '',
        type: (node as HTMLScriptElement).type,
        async: (node as HTMLScriptElement).async,
        parent: node.parentElement?.tagName ?? '',
      })),
    );
  const loaderIndex = scripts.findIndex(
    (script) => script.src === googleAnalyticsScriptUrl,
  );
  expect(loaderIndex, 'expected one exact Google Analytics loader').toBeGreaterThanOrEqual(0);
  expect(
    scripts.filter((script) => script.src === googleAnalyticsScriptUrl),
  ).toHaveLength(1);
  const loader = scripts[loaderIndex];
  expect(loader).toEqual(
    expect.objectContaining({
      async: true,
      parent: 'HEAD',
      text: '',
      type: '',
    }),
  );

  const initializerIndexes = scripts
    .map((script, index) => ({ script, index }))
    .filter(({ script }) =>
      script.text.includes(`gtag('config', '${googleAnalyticsMeasurementId}');`),
    )
    .map(({ index }) => index);
  expect(initializerIndexes).toHaveLength(1);
  const initializerIndex = initializerIndexes[0];
  const initializer = scripts[initializerIndex];
  expect(initializer.src).toBe('');
  expect(initializer.async).toBe(false);
  expect(initializer.parent).toBe('HEAD');
  expect(initializer.type).toBe('');
  expect(normalizeInlineScript(initializer.text)).toBe(
    [
      'window.dataLayer = window.dataLayer || [];',
      'function gtag(){dataLayer.push(arguments);}',
      "gtag('js', new Date());",
      `gtag('set', 'cookie_domain', '${googleAnalyticsCookieDomain}');`,
      `gtag('config', '${googleAnalyticsMeasurementId}');`,
    ].join('\n'),
  );
  expect(loaderIndex).toBeLessThan(initializerIndex);

  const sharedScripts = scripts.filter(
    (_script, index) => index !== loaderIndex && index !== initializerIndex,
  );
  expect(sharedScripts).toHaveLength(hasSharedShell ? 1 : 0);
  if (!hasSharedShell) return;

  const sharedScript = sharedScripts[0];
  expect(sharedScript?.type).toBe('module');
  if (sharedScript?.src) {
    expect(sharedScript.text).toBe('');
    expect(new URL(sharedScript.src).pathname).toMatch(/^\/_astro\/.+\.js$/);
  } else {
    expect(sharedScript?.text).toContain('diagramFullViewReady');
    expect(sharedScript?.text).toContain('figure[data-visualization-id]');
  }
}

export async function expectNoOverflowOrUnexpectedClientScripts(page: Page) {
  await expectNoPageOverflow(page);
  await expectOnlySharedDiagramClientScript(page);
}

// Compatibility name retained for existing chapter suites. The assertion now
// permits exactly the analytics pair and shared progressive diagram enhancement.
export const expectNoOverflowOrClientScripts =
  expectNoOverflowOrUnexpectedClientScripts;
