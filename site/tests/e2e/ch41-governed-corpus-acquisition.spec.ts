import { expect, test } from '@playwright/test';
import { expectNoPageOverflow } from './chapter-helpers';
const path = '/en/course/41-governed-corpus-acquisition/';

test('Chapter41 optional explanations remain keyboard-operable', async ({ page }) => {
  await page.goto(path);
  const answers = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Checked explanations for the three corpus-content verification tasks' }) });
  const summary = answers.locator('summary');
  await expect(answers).not.toHaveAttribute('open', '');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(answers).toHaveAttribute('open', '');
  await expect(answers.locator('li')).toHaveCount(3);
  await page.keyboard.press('Enter');
  await expect(answers).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
});

test('Chapter41 static report, mathematical formula and English activation', async ({ page, request }) => {
  const response = await request.get(path);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('application/x-tex');
  expect(html).toContain('Terms 1–6 of 6; page 1 of 1');
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-visualization-id]')).toHaveCount(0);
  await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
  const formula = page.locator('.katex-display annotation[encoding="application/x-tex"]').filter({ hasText: 'canonical' });
  await expect(formula).toHaveCount(1);
  expect(await formula.textContent()).toBe('\\mathrm{artifact\\_id}=\\operatorname{SHA256}(\\mathrm{canonical\\_manifest\\_bytes})');
  await expect(page.locator('pre.rust-source-code')).toHaveCount(6);
  await expect(page.locator('table tbody tr')).toHaveCount(4);
  await expect(page.locator('main')).toContainText('46');
  await expect(page.locator('pre[data-language="json"]')).toHaveCount(0);
  await expect(page.locator('a[href="https://arxiv.org/abs/1803.09010v8"]')).toHaveCount(1);
  await expect(page.locator('a[href="https://arxiv.org/abs/2303.03915v1"]')).toHaveCount(1);
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href', '/ru/course/');
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('data-locale-fallback', 'course-index');
  await page.goto('/en/course/40-reference-core-handoff/');
  await expect(page.locator('a[rel="next"]')).toHaveAttribute('href', path);
  await page.goto('/en/course/');
  await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
  await page.goto('/ru/course/');
  await expect(page.locator('a[href="/ru/course/41-governed-corpus-acquisition/"]')).toHaveCount(0);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`Chapter41 prose, table and mathematical ink containment ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(path);
    await expectNoPageOverflow(page);
    const commands = page.locator('pre[data-language="sh"]');
    await expect(commands).toHaveCount(4);
    await expect(commands.nth(0)).toContainText('COURSE_CORPUS=false ./course run cargo run --offline --locked');
    for (const [index, name] of [
      'size_digest_truncation_and_overrun_are_separate_failures',
      'provenance_changes_identity_without_changing_raw_digests',
      'failure_preserves_prior_bundle_without_publishing_partial_candidate',
    ].entries()) {
      await expect(commands.nth(index + 1)).toContainText('COURSE_CORPUS=false ./course run cargo test --offline --locked');
      await expect(commands.nth(index + 1)).toContainText(name);
      await expect(commands.nth(index + 1)).toContainText('-- --exact');
      const geometry = await commands.nth(index + 1).evaluate(element => {
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        return {left: box.left, right: box.right, viewport: innerWidth,
          overflow: style.overflowX, clipped: ['hidden', 'clip'].includes(style.overflowX)};
      });
      expect(geometry.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
      expect(geometry.clipped).toBe(false);
    }
    const errors = await page.locator('main').evaluate(node => {
      const errors: string[] = [];
      for (const element of node.querySelectorAll<HTMLElement>('p,th,td,.katex-display')) {
        const style = getComputedStyle(element), box = element.getBoundingClientRect();
        if (element.closest('dialog:not([open])')) continue;
        const mathScroller = element.matches('.katex-display');
        // Shared display math permits horizontal scrolling; its vertical ink
        // must still fit, including when the shared pipeline hides overflow-y.
        if ((!mathScroller && [style.overflowX, style.overflowY].some(v => v === 'hidden' || v === 'clip')) || style.overflowX === 'clip' || style.textOverflow === 'ellipsis') errors.push('concealed ordinary content');
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const parent = walker.currentNode.parentElement;
          if (parent?.closest('.katex-mathml,annotation')) continue;
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          for (const rect of range.getClientRects()) if (rect.width > 0) {
            if (mathScroller) {
              const top = box.top + parseFloat(style.borderTopWidth);
              const bottom = box.bottom - parseFloat(style.borderBottomWidth);
              if (rect.top < top - 1 || rect.bottom > bottom + 1) errors.push('painted math ink clipped vertically');
            } else if (rect.left < box.left - 1 || rect.right > box.right + 1) errors.push(`ink outside ${element.tagName}`);
          }
        }
      }
      return errors;
    });
    expect(errors).toEqual([]);
  });
}

test('Chapter41 forced colors retain English navigation and complete evidence', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(path);
  await expect(page.locator('h1')).toHaveText('Verify a corpus together with its provenance');
  await expect(page.locator('table tbody tr')).toHaveCount(4);
  await expect(page.locator('pre.rust-source-code')).toHaveCount(6);
  await expectNoPageOverflow(page);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 480 }]) {
  test(`Chapter41 glossary keyboard and contained scrolling ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(path);
    const trigger = page.locator('[data-cheat-sheet-open]'), dialog = page.locator('[data-cheat-sheet-dialog]');
    const close = dialog.locator('[data-cheat-sheet-close]');
    await trigger.focus(); await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible(); await expect(close).toBeFocused();
    const group = dialog.locator('[data-cheat-sheet-page][role="group"]');
    await expect(group).toHaveAttribute('aria-label', 'Terms 1–6 of 6; page 1 of 1');
    await expect(group.locator('dt')).toHaveCount(6); await expect(group.locator('dd')).toHaveCount(6);
    const safety = await dialog.evaluate(node => {
      const errors: string[] = [], bounds = node.getBoundingClientRect();
      if (bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.top < -1 || bounds.bottom > innerHeight + 1) errors.push('dialog outside viewport');
      if (node.scrollWidth > node.clientWidth + 1) errors.push('horizontal dialog overflow');
      for (const element of node.querySelectorAll<HTMLElement>('dt,dd,.cheat-sheet-term')) {
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        if ([style.overflowX, style.overflowY].some(v => v === 'hidden' || v === 'clip') || style.textOverflow === 'ellipsis') errors.push('concealed term content');
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          for (const rect of range.getClientRects()) if (rect.width > 0 && (rect.left < box.left - 1 || rect.right > box.right + 1)) errors.push('term ink outside nearest box');
        }
      }
      node.scrollTop = node.scrollHeight;
      return { errors, reachedEnd: node.scrollTop + node.clientHeight >= node.scrollHeight - 1 };
    });
    expect(safety.errors).toEqual([]); expect(safety.reachedEnd).toBe(true);
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter'); await expect(dialog).toBeVisible(); await close.click();
    await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    await expectNoPageOverflow(page);
  });
}
