import { expect, test } from '@playwright/test';

import {
  chapterLocaleDefinitions,
  expectNoOverflowOrClientScripts,
  readOrderedCourseChapters,
} from './chapter-helpers';

const repositoryUrl = 'https://github.com/intale/learn_llm';
const repositoryLinkLabels: Readonly<Record<string, string>> = {
  en: 'Browse all examples on GitHub',
  ru: 'Посмотреть все примеры на GitHub',
};

test.describe('localized shell', () => {
  test('offers ordinary links and complete alternates for every configured locale', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'mul');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/.+/);
    await expect(page.locator(`a[href="${repositoryUrl}"]`)).toHaveCount(0);
    for (const definition of chapterLocaleDefinitions) {
      await expect(
        page.locator(
          `#language-title span[lang="${definition.languageTag}"][dir="${definition.direction}"]`,
        ),
      ).toHaveCount(1);
      await expect(
        page.locator(`a[data-locale="${definition.code}"]`),
      ).toHaveAttribute('href', `/${definition.code}/`);
      await expect(
        page.locator(
          `link[rel="alternate"][hreflang="${definition.languageTag}"]`,
        ),
      ).toHaveAttribute('href', `/${definition.code}/`);
    }
    await expectNoOverflowOrClientScripts(page);

    for (const current of chapterLocaleDefinitions) {
      await page.goto(`/${current.code}/`);
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        current.languageTag,
      );
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        current.direction,
      );
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/.+/);

      for (const alternate of chapterLocaleDefinitions) {
        await expect(
          page.locator(
            `link[rel="alternate"][hreflang="${alternate.languageTag}"]`,
          ),
        ).toHaveAttribute('href', `/${alternate.code}/`);
        const switchLink = page.locator(
          `.locale-switch a[data-locale="${alternate.code}"]`,
        );
        if (alternate.code === current.code) {
          await expect(switchLink).toHaveCount(0);
        } else {
          await expect(switchLink).toHaveAttribute(
            'href',
            `/${alternate.code}/`,
          );
          await expect(switchLink).toContainText(alternate.nativeName);
        }
      }
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('synthetic multi-locale controls wrap without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${chapterLocaleDefinitions[0].code}/`);
    const switcher = page.locator('.locale-switch');
    await expect(switcher).toHaveCSS('flex-wrap', 'wrap');
    await switcher.evaluate((navigation) => {
      const link = navigation.querySelector('a');
      if (!(link instanceof HTMLAnchorElement)) {
        throw new Error('Expected one configured alternate-locale link.');
      }
      for (let index = 0; index < 7; index += 1) {
        const clone = link.cloneNode(true) as HTMLAnchorElement;
        clone.textContent = `Synthetic language ${index + 1}`;
        clone.dataset.locale = `synthetic-${index + 1}`;
        navigation.append(clone);
      }
    });
    const rows = await switcher.locator('a').evaluateAll((links) =>
      [...new Set(links.map((link) => Math.round(link.getBoundingClientRect().top)))],
    );
    expect(rows.length).toBeGreaterThan(1);
    await expectNoOverflowOrClientScripts(page);

    await page.goto('/');
    const options = page.locator('.language-options');
    await options.evaluate((navigation) => {
      const link = navigation.querySelector('a');
      if (!(link instanceof HTMLAnchorElement)) {
        throw new Error('Expected one configured language-choice link.');
      }
      for (let index = 0; index < 7; index += 1) {
        const clone = link.cloneNode(true) as HTMLAnchorElement;
        clone.querySelector('span')!.textContent =
          `Synthetic spoken language ${index + 1}`;
        clone.dataset.locale = `synthetic-choice-${index + 1}`;
        navigation.append(clone);
      }
    });
    const optionRows = await options.locator('a').evaluateAll((links) =>
      [...new Set(links.map((link) => Math.round(link.getBoundingClientRect().top)))],
    );
    expect(optionRows.length).toBeGreaterThan(2);
    await expectNoOverflowOrClientScripts(page);
  });

  for (const [index, locale] of chapterLocaleDefinitions.entries()) {
    test(`${locale.code} home links to its localized course and repository @shell:localized-home`, async ({
      page,
    }) => {
      await page.setViewportSize(
        index % 2 === 0
          ? { width: 1280, height: 720 }
          : { width: 390, height: 844 },
      );
      await page.goto(`/${locale.code}/`);

      const courseActions = page.locator('.course-actions');
      await expect(courseActions).toHaveCSS('flex-wrap', 'wrap');

      const repositoryLink = page.locator('a.repository-cta');
      await expect(repositoryLink).toHaveCount(1);
      await expect(repositoryLink).toBeVisible();
      await expect(repositoryLink).toHaveAccessibleName(
        repositoryLinkLabels[locale.code],
      );
      await expect(repositoryLink).toContainText(
        repositoryLinkLabels[locale.code],
      );
      await expect(repositoryLink).toHaveAttribute('href', repositoryUrl);
      await expect(repositoryLink).toHaveAttribute('rel', 'external');
      expect(await repositoryLink.getAttribute('target')).toBeNull();
      await repositoryLink.focus();
      await expect(repositoryLink).toBeFocused();

      const courseLink = page.locator('a.course-cta');
      await expect(courseLink).toBeVisible();
      await expect(courseLink).toHaveText(/.+/);
      await expect(courseLink).toHaveAttribute(
        'href',
        `/${locale.code}/course/`,
      );
      await courseLink.focus();
      await expect(courseLink).toBeFocused();
      await expectNoOverflowOrClientScripts(page);

      await courseLink.click();
      await expect(page).toHaveURL(new RegExp(`/${locale.code}/course/$`));
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        locale.languageTag,
      );
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        locale.direction,
      );
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/.+/);
      const chapters = await readOrderedCourseChapters(page, locale.code);
      expect(chapters[0]).toEqual(
        expect.objectContaining({
          chapterId: '01-text-units',
          order: 1,
        }),
      );
      await expectNoOverflowOrClientScripts(page);
    });
  }
});
