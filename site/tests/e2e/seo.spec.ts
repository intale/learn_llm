// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import localeManifest from '../../src/i18n/locales.json' with { type: 'json' };
import { normalizeSiteBase, sitePathForBase } from '../../src/lib/site-path';
import {
  chapterLocaleDefinitions,
  chapterLocales,
  expectOnlySharedDiagramClientScript,
  expectSeoDescription,
  type ChapterLocale,
} from './chapter-helpers';

declare const process: { env: Record<string, string | undefined> };

interface SeoCatalog {
  courseDescription: string;
  siteDescription: string;
}

const deploymentBase = normalizeSiteBase(process.env.SITE_BASE ?? '/');
const googleAnalyticsLoaderUrl =
  'https://www.googletagmanager.com/gtag/js?id=G-B5JVTL721S';

function isGoogleAnalyticsNetworkUrl(value: string): boolean {
  const hostname = new URL(value).hostname;
  return (
    hostname === 'www.googletagmanager.com' ||
    hostname === 'google-analytics.com' ||
    hostname.endsWith('.google-analytics.com')
  );
}

function isGoogleAnalyticsCollectionUrl(value: string): boolean {
  const hostname = new URL(value).hostname;
  return (
    hostname === 'google-analytics.com' ||
    hostname.endsWith('.google-analytics.com')
  );
}

function deploymentPath(path: string): string {
  return sitePathForBase(path, deploymentBase);
}

function readSeoCatalog(locale: ChapterLocale): SeoCatalog {
  const source = readFileSync(
    new URL(`../../src/i18n/catalogs/${locale}.json`, import.meta.url),
    'utf8',
  );
  const catalog = JSON.parse(source) as Partial<SeoCatalog>;
  for (const key of ['siteDescription', 'courseDescription'] as const) {
    if (typeof catalog[key] !== 'string' || catalog[key].trim() === '') {
      throw new Error(`Message catalog ${locale}.${key} must be non-empty.`);
    }
  }
  return catalog as SeoCatalog;
}

async function readCourseChapterPaths(
  page: Page,
  locale: ChapterLocale,
): Promise<string[]> {
  const coursePath = deploymentPath(`/${locale}/course/`);
  await page.goto(coursePath);

  const paths = await page.locator('.course-list h2 a').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href') ?? ''),
  );
  if (paths.length === 0) {
    await expect(page.locator('.course-note')).toBeVisible();
  }
  expect(new Set(paths).size, `${locale} chapter routes must be unique`).toBe(
    paths.length,
  );
  for (const path of paths) {
    expect(path, `${locale} course index has an empty chapter URL`).not.toBe('');
    expect(
      path.startsWith(coursePath),
      `${path} must stay beneath the localized course route`,
    ).toBe(true);
    expect(path.endsWith('/'), `${path} must use a trailing slash`).toBe(true);
  }
  return paths;
}

test('@seo publishes one relevant localized description for every current page type', async ({
  page,
}) => {
  test.setTimeout(90_000);

  const catalogs = Object.fromEntries(
    chapterLocales.map((locale) => [locale, readSeoCatalog(locale)]),
  ) as Record<ChapterLocale, SeoCatalog>;
  const defaultLocale = localeManifest.defaultLocale as ChapterLocale;
  expect(chapterLocales).toContain(defaultLocale);

  const analyticsResponses: string[] = [];
  const analyticsCollectionRequests: string[] = [];
  page.on('response', (response) => {
    if (isGoogleAnalyticsNetworkUrl(response.url())) {
      analyticsResponses.push(response.url());
    }
  });
  page.on('request', (request) => {
    if (isGoogleAnalyticsCollectionUrl(request.url())) {
      analyticsCollectionRequests.push(request.url());
    }
  });
  const failedLoader = page.waitForEvent('requestfailed', {
    predicate: (request) => request.url() === googleAnalyticsLoaderUrl,
  });

  const [loaderFailure] = await Promise.all([
    failedLoader,
    page.goto(deploymentPath('/')),
  ]);
  expect(loaderFailure.failure()?.errorText.trim()).toMatch(/\S/);
  expect(analyticsResponses).toEqual([]);
  expect(analyticsCollectionRequests).toEqual([]);
  await expectSeoDescription(page, catalogs[defaultLocale].siteDescription);
  await expectOnlySharedDiagramClientScript(page);

  for (const locale of chapterLocaleDefinitions) {
    const catalog = catalogs[locale.code];

    await page.goto(deploymentPath(`/${locale.code}/`));
    await expectSeoDescription(page, catalog.siteDescription);
    await expectOnlySharedDiagramClientScript(page);

    const chapterPaths = await readCourseChapterPaths(page, locale.code);
    await expectSeoDescription(page, catalog.courseDescription);
    await expectOnlySharedDiagramClientScript(page);

    for (const chapterPath of chapterPaths) {
      await page.goto(chapterPath);
      const visibleDescription = page.locator('.lesson-description');
      await expect(visibleDescription).toBeVisible();
      await expectSeoDescription(
        page,
        (await visibleDescription.innerText()).trim(),
      );
      await expectOnlySharedDiagramClientScript(page);
    }
  }

  expect(analyticsResponses).toEqual([]);
  expect(analyticsCollectionRequests).toEqual([]);
});
