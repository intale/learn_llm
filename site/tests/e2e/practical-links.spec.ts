import { expect, test } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

const siteBase = process.env.SITE_BASE ?? '/';
const cases = [
  { chapter: '00-course-structure', label: 'LLM from scratch', target: 'en/course/' },
  { chapter: '00-course-structure', label: 'Chapter 39', target: 'en/course/39-end-to-end-llm/' },
  { chapter: '00-course-structure', label: 'practical course index', target: 'en/practical-llm-in-rust/' },
  { chapter: '03-scalable-bpe-tokenizer', label: 'Chapter 3', target: 'en/course/03-learn-bpe-merges/' },
  { chapter: '03-scalable-bpe-tokenizer', label: 'Chapter 4', target: 'en/course/04-apply-bpe-tokenizer/' },
] as const;

for (const viewport of [{ width: 1364, height: 900 }, { width: 390, height: 844 }]) {
  for (const entry of cases) {
    test(`${entry.chapter}: ${entry.label} reaches its destination at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const response = await page.goto(`${siteBase}en/practical-llm-in-rust/${entry.chapter}/`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-chapter-root]')).toHaveAttribute('data-chapter-id', entry.chapter);
      const link = page.locator('.lesson-body').getByRole('link', { name: entry.label, exact: true });
      await expect(link).toHaveCount(1);
      const observedLabel = await link.textContent();
      const sourceUrl = page.url();
      const href = await link.getAttribute('href');
      expect(href).not.toBeNull();
      expect(new URL(href!, page.url()).pathname).toBe(siteBase + entry.target);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const resolvedUrl = new URL(href!, sourceUrl).href;
      await link.focus();
      await expect(link).toBeFocused();
      await link.press('Enter');
      await expect(page).toHaveURL(new URL(siteBase + entry.target, page.url()).href);
      await expect(page.locator('main').getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      test.info().annotations.push({ type: 'navigation-observation', description: JSON.stringify({
        chapter: entry.chapter, viewport, label: observedLabel,
        sourceUrl, href, resolvedUrl, observedDestinationUrl: page.url(),
      }) });
    });
  }
}
