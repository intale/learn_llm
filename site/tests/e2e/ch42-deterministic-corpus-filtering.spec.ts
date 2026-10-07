import { expect, test } from '@playwright/test';
// @ts-ignore Node filesystem APIs are supplied by Playwright.
import { readFileSync } from 'node:fs';
import { auditDiagramContainment } from './helpers/diagram-containment';
import { expectNoPageOverflow, expectOnlySharedDiagramClientScript } from './chapter-helpers';

const path = '/en/course/42-deterministic-corpus-filtering/';
const figureSelector = 'figure[data-visualization-id="deterministic-corpus-filtering"]';
const predecessorBaseline = readFileSync(new URL(
  '../../../artifacts/functional-laptop/chapters/41-governed-corpus-acquisition/history-repair-v5/english-html/en/course/41-governed-corpus-acquisition/index.html',
  import.meta.url,
), 'utf8');
const stages = [
  ['raw-size', '8', '1', '7'], ['utf8', '7', '1', '6'], ['min-length', '6', '1', '5'],
  ['ascii-letters', '5', '1', '4'], ['secret-marker', '4', '2', '2'],
  ['manual-marker', '2', '1', '1'], ['ascii-share-review', '1', '0', '1'],
];

test('Chapter42 static Rust evidence, mathematics and English-only navigation', async ({ page, request }) => {
  const response = await request.get(path);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('data-visualization-id="deterministic-corpus-filtering"');
  expect(html).toContain('application/x-tex');
  expect(html).toContain('Terms 1–7 of 7; page 1 of 1');
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveText('Filter records without losing their accounting');
  const figure = page.locator(figureSelector);
  await expect(figure).toHaveCount(1);
  await expect(figure.locator('figcaption')).toHaveCount(1);
  await expect(figure.locator('table')).toHaveCount(1);
  await expect(figure.locator('tbody tr')).toHaveCount(7);
  await expect(figure.locator('[data-diagram-box]')).toHaveCount(2);
  await expect(figure).toHaveAttribute('data-diagram-style', 'course-v1');
  for (const [rule, seen, terminal, survived] of stages) {
    const row = figure.locator(`tr[data-rule="${rule}"]`);
    await expect(row).toHaveAttribute('data-seen', seen);
    await expect(row).toHaveAttribute('data-terminal', terminal);
    await expect(row).toHaveAttribute('data-survived', survived);
    expect(await row.locator('annotation[encoding="application/x-tex"]').textContent()).toBe(`\\frac{${terminal}}{${seen}}`);
  }
  await expect(figure).toContainText('Not evaluated');
  await expect(figure).toContainText('Pending-review text stays withheld');
  const formula = page.locator('.katex-display annotation[encoding="application/x-tex"]').filter({ hasText: 'n_' });
  await expect(formula).toHaveCount(1);
  expect(await formula.textContent()).toBe('r_k=\\frac{n_{\\mathrm{disposition},k}}{n_{\\mathrm{seen},k}}');
  await expect(page.locator('pre.rust-source-code')).toHaveCount(8);
  await expect(page.locator('a[href="https://aclanthology.org/2021.emnlp-main.98/"]')).toHaveCount(1);
  await expect(page.locator('a[href="https://proceedings.neurips.cc/paper_files/paper/2023/hash/fa3ed726cc5073b9c31e3e49a807789c-Abstract-Datasets_and_Benchmarks.html"]')).toHaveCount(1);
  await expectOnlySharedDiagramClientScript(page);
  await expect(page.locator('a[rel="prev"]')).toHaveAttribute('href', '/en/course/41-governed-corpus-acquisition/');
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('href', '/ru/course/');
  await expect(page.locator('[data-locale="ru"]')).toHaveAttribute('data-locale-fallback', 'course-index');
  await page.goto('/en/course/41-governed-corpus-acquisition/');
  await expect(page.locator('a[rel="next"]')).toHaveAttribute('href', path);
  await page.goto('/en/course/');
  await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
  await page.goto('/ru/course/');
  await expect(page.locator('a[href="/ru/course/42-deterministic-corpus-filtering/"]')).toHaveCount(0);
});

test('Chapter41 forward link to Chapter42 is contained and preserves its baseline body', async ({ page, request }) => {
  const predecessorPath = '/en/course/41-governed-corpus-acquisition/';
  const response = await request.get(predecessorPath);
  expect(response.ok()).toBe(true);
  const actualHtml = await response.text();
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(predecessorPath);
    await page.evaluate(() => document.fonts.ready);
    const next = page.locator('a[rel="next"]');
    await expect(next).toHaveCount(1);
    await expect(next).toHaveAttribute('href', path);
    await expect(next).toHaveAttribute('data-chapter-id', '42-deterministic-corpus-filtering');
    await expect(next).toHaveText('Next chapter → Filter records without losing their accounting');
    await expect(page.locator('.filtering-evidence-grid')).toHaveCount(0);
    await expectNoPageOverflow(page);
    expect(await page.evaluate(({ baseline, actual, destination }) => {
      const parser = new DOMParser();
      const before = parser.parseFromString(baseline, 'text/html');
      const after = parser.parseFromString(actual, 'text/html');
      const added = after.querySelectorAll('a[rel="next"]');
      if (before.querySelector('a[rel="next"]') || added.length !== 1 ||
          added[0].getAttribute('href') !== destination) return false;
      added[0].remove();
      return after.body.innerHTML === before.body.innerHTML;
    }, { baseline: predecessorBaseline, actual: actualHtml, destination: path })).toBe(true);
    const errors = await next.evaluate(link => {
      const errors: string[] = [];
      const navigation = link.closest('nav');
      if (!navigation) return ['forward link has no navigation owner'];
      const innerBox = (element: Element) => {
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        if ([style.overflowX, style.overflowY].some(value => value === 'hidden' || value === 'clip') || style.textOverflow === 'ellipsis') errors.push('concealed navigation content');
        return { left: box.left + parseFloat(style.borderLeftWidth), right: box.right - parseFloat(style.borderRightWidth), top: box.top + parseFloat(style.borderTopWidth), bottom: box.bottom - parseFloat(style.borderBottomWidth) };
      };
      const bounds = innerBox(link), owner = innerBox(navigation), box = link.getBoundingClientRect();
      if (box.left < owner.left - 1 || box.right > owner.right + 1 || box.top < owner.top - 1 || box.bottom > owner.bottom + 1) errors.push('forward-link box escapes navigation owner');
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) if (rect.width > 0 &&
          (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)) errors.push('forward-link text ink escapes its own box');
      }
      return errors;
    });
    expect(errors).toEqual([]);
    const destination = new URL(path, page.url()).href;
    await next.click();
    await expect(page).toHaveURL(destination);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveText('Filter records without losing their accounting');
  }
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`Chapter42 complete nearest-box and formula-ink containment ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(path);
    await expectNoPageOverflow(page);
    expect((await auditDiagramContainment(page.locator(figureSelector))).errors).toEqual([]);
    const commands = page.locator('pre[data-language="sh"]');
    await expect(commands).toHaveCount(4);
    for (const [index, name] of [
      'fixture_counts_and_byte_conservation', 'swapping_secret_and_review_changes_first_terminal',
      'withdrawal_reaches_known_descendants_once',
    ].entries()) {
      await expect(commands.nth(index + 1)).toContainText(name);
      await expect(commands.nth(index + 1)).toContainText('-- --exact');
    }
    const errors = await page.locator('main').evaluate(node => {
      const errors: string[] = [];
      for (const element of node.querySelectorAll<HTMLElement>('p,th,td,.katex-display')) {
        if (element.closest('dialog:not([open])')) continue;
        const style = getComputedStyle(element), box = element.getBoundingClientRect();
        const mathScroller = element.matches('.katex-display');
        if ((!mathScroller && [style.overflowX, style.overflowY].some(value => value === 'hidden' || value === 'clip')) || style.overflowX === 'clip' || style.textOverflow === 'ellipsis') errors.push('concealed ordinary content');
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const parent = walker.currentNode.parentElement;
          if (parent?.closest('.katex-mathml,annotation')) continue;
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          for (const rect of range.getClientRects()) if (rect.width > 0) {
            if (mathScroller) {
              const top = box.top + parseFloat(style.borderTopWidth), bottom = box.bottom - parseFloat(style.borderBottomWidth);
              if (rect.top < top - 1 || rect.bottom > bottom + 1) errors.push('painted math ink clipped vertically');
            } else if (rect.left < box.left - 1 || rect.right > box.right + 1) errors.push(`ink outside ${element.tagName}`);
          }
        }
      }
      for (const command of node.querySelectorAll<HTMLElement>('pre[data-language="sh"]')) {
        const box = command.getBoundingClientRect(), style = getComputedStyle(command);
        if (box.left < -1 || box.right > innerWidth + 1) errors.push('command box outside viewport');
        if (['hidden', 'clip'].includes(style.overflowX)) errors.push('concealed command');
      }
      return errors;
    });
    expect(errors).toEqual([]);
    if (viewport.width < 800) await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
  });
}

test('Chapter42 keyboard full view reuses one readable evidence tree', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(path);
  const figure = page.locator(figureSelector), toggle = figure.locator('[data-diagram-full-view-toggle]');
  await expect(toggle).toHaveCount(1);
  const before = await figure.evaluate(node => ({ text: [...node.querySelectorAll('figcaption,[data-diagram-box]')].map(element => element.textContent), font: parseFloat(getComputedStyle(node).fontSize) }));
  await figure.evaluate(node => { (window as typeof window & { __ch42Figure?: Element }).__ch42Figure = node; });
  await toggle.focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.fullscreenElement !== null);
  expect(await figure.evaluate(node => (window as typeof window & { __ch42Figure?: Element }).__ch42Figure === node)).toBe(true);
  expect(await figure.locator('figcaption,[data-diagram-box]').allTextContents()).toEqual(before.text);
  expect(await figure.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(before.font);
  expect((await auditDiagramContainment(figure)).errors).toEqual([]);
  await figure.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(figure.locator('[data-diagram-box]').last()).toBeInViewport();
  await expect(toggle).toBeInViewport();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.fullscreenElement === null);
  await expect(toggle).toBeFocused(); await expect(figure).toHaveCount(1);
});

test('Chapter42 forced colors and RTL retain complete evidence and containment', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(path);
  await page.locator('html').evaluate(node => node.setAttribute('dir', 'rtl'));
  const figure = page.locator(figureSelector);
  await expect(figure.locator('tbody tr')).toHaveCount(7);
  await expect(page.locator('pre.rust-source-code')).toHaveCount(8);
  expect((await auditDiagramContainment(figure)).errors).toEqual([]);
  await expectNoPageOverflow(page);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 480 }]) {
  test(`Chapter42 seven-term glossary keyboard and contained scrolling ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto(path);
    const trigger = page.locator('[data-cheat-sheet-open]'), dialog = page.locator('[data-cheat-sheet-dialog]');
    const close = dialog.locator('[data-cheat-sheet-close]');
    await trigger.focus(); await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible(); await expect(close).toBeFocused();
    const group = dialog.locator('[data-cheat-sheet-page][role="group"]');
    await expect(group).toHaveAttribute('aria-label', 'Terms 1–7 of 7; page 1 of 1');
    await expect(group.locator('dt')).toHaveCount(7); await expect(group.locator('dd')).toHaveCount(7);
    const safety = await dialog.evaluate(node => {
      const errors: string[] = [], bounds = node.getBoundingClientRect();
      if (bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.top < -1 || bounds.bottom > innerHeight + 1) errors.push('dialog outside viewport');
      if (node.scrollWidth > node.clientWidth + 1) errors.push('horizontal dialog overflow');
      for (const element of node.querySelectorAll<HTMLElement>('dt,dd,.cheat-sheet-term')) {
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        if ([style.overflowX, style.overflowY].some(value => value === 'hidden' || value === 'clip') || style.textOverflow === 'ellipsis') errors.push('concealed term content');
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          for (const rect of range.getClientRects()) if (rect.width > 0 && (rect.left < box.left - 1 || rect.right > box.right + 1)) errors.push('term ink outside nearest box');
        }
      }
      node.scrollTop = node.scrollHeight;
      const last = node.querySelector('.cheat-sheet-term:last-child')!.getBoundingClientRect();
      return { errors, reachedEnd: node.scrollTop + node.clientHeight >= node.scrollHeight - 1, lastBottom: last.bottom, dialogBottom: bounds.bottom };
    });
    expect(safety.errors).toEqual([]); expect(safety.reachedEnd).toBe(true);
    expect(safety.lastBottom).toBeLessThanOrEqual(safety.dialogBottom + 1);
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter'); await expect(dialog).toBeVisible(); await close.click();
    await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    await expectNoPageOverflow(page);
  });
}
