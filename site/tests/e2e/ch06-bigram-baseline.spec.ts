import { expect, test } from '@playwright/test';

test('@chapter:06-bigram-baseline renders its count and probability table', async ({ page }) => {
  await page.goto('/en/course/06-bigram-baseline/');
  await expect(page.getByRole('heading', { name: /bigram/i }).first()).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
});
