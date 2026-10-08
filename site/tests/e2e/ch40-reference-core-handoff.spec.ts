import { expect, test } from '@playwright/test';
// @ts-ignore Shared plain Node locale projection.
import {readFunctionalChapterLocaleConfiguration} from '../../../scripts/functional-chapter-locale-config.mjs';
import { auditDiagramContainment } from './helpers/diagram-containment';
import { expectNoPageOverflow, expectOnlySharedDiagramClientScript } from './chapter-helpers';
for (const locale of readFunctionalChapterLocaleConfiguration('..').chapters.find((chapter: {chapterId:string}) => chapter.chapterId === '40-reference-core-handoff')!.activeLocales) {
const path = `/${locale}/course/40-reference-core-handoff/`;
const figureSelector = 'figure[data-visualization-id="reference-core-handoff"]';
const digest = 'cd06104ff61dc8a0c6cbe6e842847952343050eb4942c79aa1d17e8d0d0bb648';

test(`${locale} Chapter40 static evidence, formula and activated neighbor surfaces`, async ({ page, request }) => {
  const response = await request.get(path);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('data-visualization-id="reference-core-handoff"');
  expect(html).toContain(digest);
  expect(html).toContain('application/x-tex');
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  const figure = page.locator(figureSelector);
  await expect(figure).toHaveCount(1);
  await expect(figure.locator('figcaption')).toHaveCount(1);
  await expect(figure.locator('[data-diagram-box]')).toHaveCount(3);
  await expect(figure).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(figure).toContainText(digest);
  for (const text of ['1188', '1744', '442', '[260,34,34]']) await expect(figure).toContainText(text);
  await expect(page.locator('.katex annotation[encoding="application/x-tex"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="https://arxiv.org/abs/1810.03993v2"]')).toHaveCount(1);
  await expect(page.locator('a[href="https://arxiv.org/abs/2002.06305v1"]')).toHaveCount(1);
  await expectOnlySharedDiagramClientScript(page);
  await page.goto(`/${locale}/course/39-end-to-end-llm/`);
  await expect(page.locator('a[rel="next"]')).toHaveAttribute('href', path);
  await page.goto(`/${locale}/course/`);
  await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`${locale} Chapter40 nearest-box containment ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(path);
    await expectNoPageOverflow(page);
    expect((await auditDiagramContainment(page.locator(figureSelector))).errors).toEqual([]);
    if (viewport.width < 800) await expect(page.locator(`${figureSelector} [data-diagram-full-view-toggle]`)).toHaveCount(0);
  });
}

test(`${locale} Chapter40 full view reuses one readable tree with keyboard exit and reachability`, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(path);
  const figure = page.locator(figureSelector);
  const toggle = figure.locator('[data-diagram-full-view-toggle]');
  await expect(toggle).toHaveCount(1);
  const before = await figure.evaluate(node => ({ text: [...node.querySelectorAll('figcaption,[data-diagram-box]')].map(element => element.textContent), font: parseFloat(getComputedStyle(node).fontSize) }));
  await figure.evaluate(node => { (window as typeof window & { __ch40Figure?: Element }).__ch40Figure = node; });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.fullscreenElement !== null);
  expect(await figure.evaluate(node => (window as typeof window & { __ch40Figure?: Element }).__ch40Figure === node)).toBe(true);
  expect(await figure.locator('figcaption,[data-diagram-box]').allTextContents()).toEqual(before.text);
  expect(await figure.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(before.font);
  expect((await auditDiagramContainment(figure)).errors).toEqual([]);
  await figure.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(figure.locator('[data-diagram-box]').last()).toBeInViewport();
  await expect(toggle).toBeInViewport();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.fullscreenElement === null);
  await expect(toggle).toBeFocused();
  await expect(figure).toHaveCount(1);
});

test(`${locale} Chapter40 forced colors and RTL retain containment and literal data direction`, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(path);
  await page.locator('html').evaluate(node => node.setAttribute('dir', 'rtl'));
  const figure = page.locator(figureSelector);
  expect((await auditDiagramContainment(figure)).errors).toEqual([]);
  await expect(figure.locator('bdi[dir="ltr"]')).toHaveCount(2);
  await expectNoPageOverflow(page);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 480 }]) {
  test(`${locale} Chapter40 cheat sheet keyboard and contained scrolling ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(path);
    const trigger = page.locator('[data-cheat-sheet-open]');
    const dialog = page.locator('[data-cheat-sheet-dialog]');
    const close = dialog.locator('[data-cheat-sheet-close]');
    await expect(trigger).toHaveCount(1);
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(close).toBeFocused();
    const group = dialog.locator('[data-cheat-sheet-page][role="group"]');
    await expect(group).toHaveCount(1);
    await expect(group).toHaveAttribute('aria-label', locale === 'en' ? 'Terms 1–7 of 7; page 1 of 1' : 'Термины: 1–7 из 7; страница 1 из 1');
    await expect(group.locator('dt')).toHaveCount(7);
    await expect(group.locator('dd')).toHaveCount(7);
    const safety = await dialog.evaluate(node => {
      const errors: string[] = [];
      const bounds = node.getBoundingClientRect();
      if (bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.top < -1 || bounds.bottom > innerHeight + 1) errors.push('dialog outside viewport');
      if (node.scrollWidth > node.clientWidth + 1) errors.push('horizontal dialog overflow');
      for (const element of node.querySelectorAll<HTMLElement>('dt,dd,.cheat-sheet-term')) {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if ([style.overflowX, style.overflowY].some(value => value === 'hidden' || value === 'clip') || style.textOverflow === 'ellipsis') errors.push('concealed term content');
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          for (const rect of range.getClientRects()) if (rect.width > 0 && (rect.left < box.left - 1 || rect.right > box.right + 1)) errors.push('term ink outside nearest box');
        }
      }
      node.scrollTop = node.scrollHeight;
      const last = node.querySelector('.cheat-sheet-term:last-child')!.getBoundingClientRect();
      return { errors, reachedEnd: node.scrollTop + node.clientHeight >= node.scrollHeight - 1, lastBottom: last.bottom, dialogBottom: bounds.bottom };
    });
    expect(safety.errors).toEqual([]);
    expect(safety.reachedEnd).toBe(true);
    expect(safety.lastBottom).toBeLessThanOrEqual(safety.dialogBottom + 1);
    await expectNoPageOverflow(page);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await close.click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
}
}
