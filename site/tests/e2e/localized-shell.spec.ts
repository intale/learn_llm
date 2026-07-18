import { expect, test } from '@playwright/test';

import { readOrderedCourseChapters } from './chapter-helpers';

test.describe('localized shell', () => {
  test('offers ordinary links and renders both static locales without client JavaScript', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'mul');
    await expect(
      page.getByRole('heading', { name: /Choose a language/ }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /English/ })).toHaveAttribute(
      'href',
      '/en/',
    );
    await expect(page.getByRole('link', { name: /Русский/ })).toHaveAttribute(
      'href',
      '/ru/',
    );
    await expect(page.locator('script')).toHaveCount(0);

    await page.getByRole('link', { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('heading', { name: 'Build an LLM from first principles' }),
    ).toBeVisible();
    await expect(
      page.locator('link[rel="alternate"][hreflang="ru"]'),
    ).toHaveAttribute('href', '/ru/');
    await expect(page.getByRole('link', { name: 'Русский' })).toHaveAttribute(
      'href',
      '/ru/',
    );

    await page.getByRole('link', { name: 'Русский' }).click();
    await expect(page).toHaveURL(/\/ru\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(
      page.getByRole('heading', { name: 'Соберите LLM с нуля' }),
    ).toBeVisible();
    await expect(
      page.locator('link[rel="alternate"][hreflang="en"]'),
    ).toHaveAttribute('href', '/en/');
    await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      '/en/',
    );
    await expect(page.locator('script')).toHaveCount(0);
  });

  for (const journey of [
    {
      locale: 'en',
      linkLabel: 'Start the course',
      courseTitle: 'From text to a tiny language model',
      chapterTitle: 'Text units and vocabulary IDs',
      viewport: { width: 1280, height: 720 },
    },
    {
      locale: 'ru',
      linkLabel: 'Начать курс',
      courseTitle: 'От текста до небольшой языковой модели',
      chapterTitle: 'Единицы текста и идентификаторы токенов',
      viewport: { width: 390, height: 844 },
    },
  ] as const) {
    test(`${journey.locale} home links to its localized course`, async ({
      page,
    }) => {
      await page.setViewportSize(journey.viewport);
      await page.goto(`/${journey.locale}/`);

      const courseLink = page.getByRole('link', {
        name: journey.linkLabel,
        exact: true,
      });
      await expect(courseLink).toBeVisible();
      await expect(courseLink).toHaveAttribute(
        'href',
        `/${journey.locale}/course/`,
      );
      await courseLink.focus();
      await expect(courseLink).toBeFocused();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        )
        .toBe(true);

      await courseLink.click();
      await expect(page).toHaveURL(new RegExp(`/${journey.locale}/course/$`));
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        journey.locale,
      );
      await expect(
        page.getByRole('heading', { name: journey.courseTitle }),
      ).toBeVisible();
      const chapters = await readOrderedCourseChapters(page, journey.locale);
      expect(chapters[0]).toEqual(
        expect.objectContaining({
          chapterId: '01-text-units',
          order: 1,
          title: journey.chapterTitle,
        }),
      );
      await expect(page.locator('script')).toHaveCount(0);
    });
  }
});
