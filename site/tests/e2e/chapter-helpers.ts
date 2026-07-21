import { expect, type Page } from '@playwright/test';

import localeManifest from '../../src/i18n/locales.json' with { type: 'json' };

export type ChapterLocale = keyof typeof localeManifest.locales;
export const chapterLocales = Object.freeze(
  Object.keys(localeManifest.locales) as ChapterLocale[],
);
export const chapterLocaleDefinitions = Object.freeze(
  chapterLocales.map((code) => ({ code, ...localeManifest.locales[code] })),
);

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
  origin?: string;
  requireContiguousPrefix?: boolean;
}

export function chapterTag(chapterId: string) {
  return `@chapter:${chapterId}`;
}

export function chapterPath(locale: ChapterLocale, chapterId: string) {
  return `/${locale}/course/${chapterId}/`;
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

  return chapters.map((chapter, index) => {
    const previousOrder = chapters[index - 1]?.order ?? 0;
    const expectedOrder = expectsContiguousPrefix ? index + 1 : chapter.order;
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
    { decision: 'useful'; id: string } | { decision: 'not-useful'; id: null },
) {
  const figures = page.locator('figure[data-visualization-id]');
  if (visualization.decision === 'not-useful') {
    await expect(figures).toHaveCount(0);
    return;
  }

  const figure = page.locator(
    `figure[data-visualization-id="${visualization.id}"]`,
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

export async function expectNoOverflowOrClientScripts(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  await expect(page.locator('script')).toHaveCount(0);
}
