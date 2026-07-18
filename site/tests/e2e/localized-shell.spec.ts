import { expect, test } from '@playwright/test';

test.describe('localized shell', () => {
  test('offers ordinary links and renders both static locales without client JavaScript', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'mul');
    await expect(page.getByRole('heading', { name: /Choose a language/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /English/ })).toHaveAttribute('href', '/en/');
    await expect(page.getByRole('link', { name: /Русский/ })).toHaveAttribute('href', '/ru/');
    await expect(page.locator('script')).toHaveCount(0);

    await page.getByRole('link', { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Build an LLM from first principles' })).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute('href', '/ru/');
    await expect(page.getByRole('link', { name: 'Русский' })).toHaveAttribute('href', '/ru/');

    await page.getByRole('link', { name: 'Русский' }).click();
    await expect(page).toHaveURL(/\/ru\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { name: 'Соберите LLM с нуля' })).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', '/en/');
    await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/');
    await expect(page.locator('script')).toHaveCount(0);
  });
});
