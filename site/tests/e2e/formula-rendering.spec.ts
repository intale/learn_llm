import { expect, test } from '@playwright/test';

import { expectNoOverflowOrClientScripts } from './chapter-helpers';

const chapterIds = [
  '01-text-units',
  '02-corpus-partitions',
  '03-learn-bpe-merges',
  '04-apply-bpe-tokenizer',
  '05-autoregressive-examples',
  '06-bigram-baseline',
  '07-language-model-metrics',
] as const;
const locales = ['en', 'ru'] as const;
const viewports = {
  desktop: { width: 1280, height: 900 },
  narrow: { width: 390, height: 844 },
} as const;
const formerMathCode = new Set([
  'i',
  'r',
  'k',
  'T',
  'S',
  'N',
  's_k',
  'T+1',
  'x_i',
  'y_i',
  'C(a,b)',
  '-a',
  '-b',
  '256+r',
  '256+k',
  'encode_content(decode_content(z)) = z',
  'C_{ij}',
  'N_i',
  'alpha',
  '-ln p',
  'NLL',
  'PPL',
  'p=0',
  'exp(NLL/N)',
]);

test.describe('@formula-rendering:ch01-ch07 rendered formula contract', () => {
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    for (const locale of locales) {
      for (const chapterId of chapterIds) {
        test(`${viewportName} ${locale}/${chapterId} exposes readable server-rendered math`, async ({
          page,
        }) => {
          await page.setViewportSize(viewport);
          const response = await page.goto(`/${locale}/course/${chapterId}/`);
          expect(response?.ok()).toBe(true);
          await expect(page.locator('article.lesson')).toBeVisible();
          await expectNoOverflowOrClientScripts(page);

          const math = page.locator('.lesson-body .katex');
          const mathCount = await math.count();
          expect(mathCount, `${locale}/${chapterId} should render formulas`).toBeGreaterThan(0);
          await expect(
            page.locator(
              '.lesson-body .katex annotation[encoding="application/x-tex"]',
            ),
          ).toHaveCount(mathCount);
          await expect(page.locator('.lesson-body .katex .katex-mathml')).toHaveCount(
            mathCount,
          );

          const geometryProblems = await page
            .locator('.lesson-body .katex-display, .lesson-body [data-inline-math]')
            .evaluateAll((nodes) =>
              nodes.flatMap((node, index) => {
                const element = node as HTMLElement;
                const rect = element.getBoundingClientRect();
                const problems: string[] = [];
                if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) {
                  problems.push(`formula ${index} escapes the viewport horizontally`);
                }
                if (rect.height <= 0 || rect.width <= 0) {
                  problems.push(`formula ${index} has no visible box`);
                }
                const { overflowY } = getComputedStyle(element);
                if (
                  ['auto', 'clip', 'hidden', 'scroll'].includes(overflowY) &&
                  element.scrollHeight > element.clientHeight + 2
                ) {
                  problems.push(`formula ${index} clips vertically`);
                }

                if (element.classList.contains('katex-display')) {
                  const container = element.parentElement;
                  const next = container?.nextElementSibling as HTMLElement | null;
                  if (container && next) {
                    const nextRect = next.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    if (containerRect.bottom > nextRect.top + 1) {
                      problems.push(`formula ${index} overlaps the following block`);
                    }
                  }
                }
                return problems;
              }),
            );
          expect(geometryProblems).toEqual([]);

          const inlineCode = await page
            .locator('.lesson-body :not(pre) > code')
            .allInnerTexts();
          expect(
            inlineCode.filter((value) => formerMathCode.has(value.trim())),
          ).toEqual([]);

          if (chapterId === '02-corpus-partitions') {
            await expect(
              page.locator(
                '[data-assigned-count="12"] annotation[encoding="application/x-tex"]',
              ),
            ).toHaveText(String.raw`\frac{12}{12}`);
          }
          if (chapterId === '04-apply-bpe-tokenizer') {
            await expect(
              page.locator(
                '[data-inline-math] annotation[encoding="application/x-tex"]',
              ),
            ).toHaveText('+2');
          }
        });
      }
    }
  }
});
