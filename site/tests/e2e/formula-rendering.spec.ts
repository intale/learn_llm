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
const chapter08To13Ids = [
  '08-tensor-storage',
  '09-tensor-views',
  '10-broadcasting-reductions',
  '11-matrix-multiplication',
  '12-stable-softmax',
  '13-gradient-checking',
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
  'i_k',
  's_k',
  'd=0',
  '2×3=6',
  '0 ≤ i_k < shape[k]',
  'n_k',
  "n'_j",
  'π(k)',
  '2×3 = 3×2 = 6',
  'start × stride[axis]',
  '0 + 1×1 = 1',
  'y_i',
  'beta_a(i)',
  'beta_b(i)',
  'usize::MAX × 2',
  'C[1,0]',
  'k=0',
  'K-1',
  'A[i,k]',
  'B[k,j]',
  '[...,M,K]',
  '[...,K,N]',
  'W^T',
  'K=0',
  'QK^T',
  'exp(1000)',
  'ln(1 + tail)',
  '1 + tail',
  'q(2.9)=8.41',
  'q(3.1)=9.61',
  '2h=0.2',
  'theta^2',
  'theta-h',
  'theta+h',
  'scale=max(1,abs(a),abs(n))',
  'scaled_error=abs(a/scale-n/scale)',
  'g(theta)=theta^3-2theta',
  'h=1e-5',
]);

const chapter08To13Latex: Record<(typeof chapter08To13Ids)[number], readonly string[]> = {
  '08-tensor-storage': [String.raw`i_0s_0`, String.raw`0 \le i_k`],
  '09-tensor-views': [String.raw`2\cdot3=3\cdot2=6`, String.raw`QK^{\mathsf T}`],
  '10-broadcasting-reductions': [String.raw`\beta_{\mathrm{tokens}}`, String.raw`3\ne2`],
  '11-matrix-multiplication': [String.raw`C_{1,0}`, String.raw`4.0\cdot1.0=4.0`],
  '12-stable-softmax': [String.raw`[-1001,-1000]-(-1000)`, String.raw`\ln(1+\mathrm{tail})`],
  '13-gradient-checking': [String.raw`q(\theta)=\theta^2`, String.raw`s=\max`],
};

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

test.describe('@formula-rendering:ch08-ch13 rendered formula contract', () => {
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    for (const chapterId of chapter08To13Ids) {
      test(`${viewportName} en/${chapterId} exposes readable server-rendered math`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        const response = await page.goto(`/en/course/${chapterId}/`);
        expect(response?.ok()).toBe(true);
        await expect(page.locator('article.lesson')).toBeVisible();
        await expectNoOverflowOrClientScripts(page);

        const math = page.locator('.lesson-body .katex');
        const mathCount = await math.count();
        expect(mathCount, `${chapterId} should render formulas`).toBeGreaterThan(0);
        await expect(
          page.locator('.lesson-body .katex annotation[encoding="application/x-tex"]'),
        ).toHaveCount(mathCount);
        await expect(page.locator('.lesson-body .katex .katex-mathml')).toHaveCount(mathCount);
        await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);

        const latex = await page
          .locator('.lesson-body .katex annotation[encoding="application/x-tex"]')
          .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
        for (const fragment of chapter08To13Latex[chapterId]) {
          expect(
            latex.some((expression) => expression.includes(fragment)),
            `${chapterId} should render ${fragment}`,
          ).toBe(true);
        }

        const geometryProblems = await page
          .locator('.lesson-body .katex-display, .lesson-body [data-inline-math]')
          .evaluateAll((nodes) =>
            nodes.flatMap((node, index) => {
              const element = node as HTMLElement;
              const rect = element.getBoundingClientRect();
              const problems: string[] = [];
              const source =
                element
                  .querySelector('annotation[encoding="application/x-tex"]')
                  ?.textContent?.trim() ?? `index ${index}`;
              let scrollAncestor: HTMLElement | null = element.parentElement;
              let containedByHorizontalScroller = false;
              while (scrollAncestor && scrollAncestor !== document.body) {
                const { overflowX } = getComputedStyle(scrollAncestor);
                if (
                  ['auto', 'scroll'].includes(overflowX) &&
                  scrollAncestor.scrollWidth > scrollAncestor.clientWidth + 1
                ) {
                  containedByHorizontalScroller = true;
                  break;
                }
                scrollAncestor = scrollAncestor.parentElement;
              }
              if (
                (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) &&
                !containedByHorizontalScroller
              ) {
                problems.push(`formula ${source} escapes the viewport horizontally`);
              }
              if (rect.height <= 0 || rect.width <= 0) {
                problems.push(`formula ${source} has no visible box`);
              }
              const { overflowY } = getComputedStyle(element);
              if (
                ['auto', 'clip', 'hidden', 'scroll'].includes(overflowY) &&
                element.scrollHeight > element.clientHeight + 2
              ) {
                problems.push(`formula ${source} clips vertically`);
              }
              if (element.classList.contains('katex-display')) {
                const container = element.parentElement;
                const next = container?.nextElementSibling as HTMLElement | null;
                if (container && next) {
                  const nextRect = next.getBoundingClientRect();
                  const containerRect = container.getBoundingClientRect();
                  if (containerRect.bottom > nextRect.top + 1) {
                    problems.push(`formula ${source} overlaps the following block`);
                  }
                }
              }
              return problems;
            }),
          );
        expect(geometryProblems).toEqual([]);

        const inlineCode = await page.locator('.lesson-body :not(pre) > code').allInnerTexts();
        expect(inlineCode.filter((value) => formerMathCode.has(value.trim()))).toEqual([]);
      });
    }
  }
});
