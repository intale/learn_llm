import { expect, test, type Page } from '@playwright/test';

import {
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type CourseChapterLink,
} from './chapter-helpers';

const chapterId = '23-neural-ngram';
const chapterTitle = 'Train a fixed-context neural language model';
const chapterDescription =
  'Assemble embeddings, a SwiGLU hidden layer, indexed next-token loss, mini-batches, and AdamW into a deterministic neural n-gram whose held-out loss improves.';
const diagramDescription =
  'Follow exact Rust-authored token IDs through embeddings, concatenation, a hidden state, and vocabulary logits, then compare complete training and validation losses.';
const chapterHeadings = [
  'Predict one token from the complete context',
  'Concatenate embeddings before the hidden layer',
  'Keep context, feature, and vocabulary axes distinct',
  'From sparse counts to learned contexts and attention',
  'Own one parameter set across every update',
  'Follow one context and the held-out loss',
  'Predict before training',
  'Replace fixed context with causal sequence mixing next',
] as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, '');

async function expectFormulaGeometry(page: Page) {
  const problems = await page
    .locator('.lesson-body .katex-display, .lesson-body [data-inline-math]')
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();
        const source =
          element.querySelector('annotation[encoding="application/x-tex"]')?.textContent ??
          `formula ${index}`;
        const issues: string[] = [];
        let ancestor: HTMLElement | null = element.parentElement;
        let localScroller = false;
        while (ancestor && ancestor !== document.body) {
          const { overflowX } = getComputedStyle(ancestor);
          if (
            ['auto', 'scroll'].includes(overflowX) &&
            ancestor.scrollWidth > ancestor.clientWidth + 1
          ) {
            localScroller = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        if (
          (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) &&
          !localScroller
        ) {
          issues.push(`${source} escapes the viewport`);
        }
        if (rect.width <= 0 || rect.height <= 0) issues.push(`${source} has no visible box`);
        const style = getComputedStyle(element);
        if (style.direction !== 'ltr') issues.push(`${source} is not left-to-right`);
        if (
          ['auto', 'clip', 'hidden', 'scroll'].includes(style.overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) {
          issues.push(`${source} clips vertically`);
        }
        if (element.classList.contains('katex-display')) {
          const renderedBoxes = Array.from(
            element.querySelectorAll<HTMLElement>('.katex-html *'),
          )
            .map((rendered) => rendered.getBoundingClientRect())
            .filter((rendered) => rendered.width > 0 && rendered.height > 0);
          if (renderedBoxes.length === 0) {
            issues.push(`${source} has no rendered HTML boxes`);
          } else {
            const renderedTop = Math.min(...renderedBoxes.map((rendered) => rendered.top));
            const renderedBottom = Math.max(...renderedBoxes.map((rendered) => rendered.bottom));
            if (renderedTop < rect.top - 1) {
              issues.push(`${source} clips its upper rendered limit`);
            }
            if (renderedBottom > rect.bottom + 1) {
              issues.push(`${source} clips its lower rendered limit`);
            }
          }
          const container = element.parentElement;
          const next = container?.nextElementSibling as HTMLElement | null;
          if (
            container &&
            next &&
            container.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1
          ) {
            issues.push(`${source} overlaps the following block`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectLocalFormulaSeparation(page: Page) {
  const overlaps = await page
    .locator(
      'figure[data-visualization-id="neural-ngram"] .pipeline-card, figure[data-visualization-id="neural-ngram"] .checkpoint-card, figure[data-visualization-id="neural-ngram"] .result-grid',
    )
    .evaluateAll((containers) =>
      containers.flatMap((container, containerIndex) => {
        const formulas = Array.from(container.querySelectorAll<HTMLElement>('[data-inline-math]'));
        const issues: string[] = [];
        for (let leftIndex = 0; leftIndex < formulas.length; leftIndex += 1) {
          const left = formulas[leftIndex].getBoundingClientRect();
          for (let rightIndex = leftIndex + 1; rightIndex < formulas.length; rightIndex += 1) {
            const right = formulas[rightIndex].getBoundingClientRect();
            const horizontal = left.left < right.right - 1 && right.left < left.right - 1;
            const vertical = left.top < right.bottom - 1 && right.top < left.bottom - 1;
            if (horizontal && vertical) {
              issues.push(
                `container ${containerIndex} formulas ${leftIndex} and ${rightIndex} overlap`,
              );
            }
          }
        }
        return issues;
      }),
    );
  expect(overlaps).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 23,
    revision: 1,
    revisionLabel: 'Content revision',
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);
  await expect(page.locator('.lesson-body h2')).toHaveText(chapterHeadings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [
    String.raw`[1,2]\to[1,2,4]\to[1,8]\to[1,8]\to[1,266]`,
    String.raw`h=\operatorname{SwiGLU}([E_{z_{t-C}},\ldots,E_{z_{t-1}}]),\quad \ell=hW_o`,
    String.raw`E\in\mathbb{R}^{V\times D}`,
    String.raw`[B,H][H,V]=[B,V]`,
    String.raw`L=-\frac{1}{B}\sum_{b=1}^{B}\log`,
    String.raw`y_b=\operatorname{target\_row}(b)_{C-1}`,
    String.raw`V=266,\ C=2,\ D=4,\ H=8`,
    String.raw`N_{\mathrm{train}}=1836,\ N_{\mathrm{val}}=467`,
    String.raw`\eta=0.010000,\ t_{\max}=15`,
    String.raw`L_{\mathrm{train}}=5.555850`,
    String.raw`L_{\mathrm{val}}=5.557362`,
    String.raw`\Delta L_{\mathrm{val}}=0.026120`,
  ]) {
    expect(
      annotations.map(normalizeMath).some((formula) => formula.includes(normalizeMath(expected))),
      `expected a rendered formula containing ${expected}`,
    ).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  const code = await page.locator('.lesson-body :not(pre) > code').allTextContents();
  for (const expression of [
    'hW_o',
    'C*D',
    '[B,C]',
    '[B,C,D]',
    '[B,CD]',
    '[B,H]',
    '[B,V]',
    'target_row(b)[C-1]',
  ]) {
    expect(code).not.toContain(expression);
  }
  await expectFormulaGeometry(page);

  const history = page
    .getByRole('heading', {
      level: 2,
      name: 'From sparse counts to learned contexts and attention',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From sparse counts to learned contexts and attention"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain('Classical count n-grams estimate each short context separately');
  expect(historyText).toContain('bigram keyed only by final token');
  expect(historyText).toContain('mixes two followers');
  expect(historyText).toContain('learned distributed word features and a feed-forward network');
  expect(historyText).toContain('replace recurrence and convolution with attention');
  expect(historyText).toContain('road to modern LLMs');
  expect(historyText).toContain('programming-language history is not the subject');
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(2);

  await expect(page.locator('figure.rust-source')).toHaveCount(7);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'neural-ngram' });
  const diagram = page.locator('figure[data-visualization-id="neural-ngram"]');
  await expect(diagram).toHaveAccessibleName('Follow one context through training');
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);

  const cards = diagram.locator('.pipeline-card');
  await expect(cards).toHaveCount(5);
  expect(await cards.evaluateAll((nodes) => nodes.map((node) => node.dataset.stage))).toEqual([
    'context_ids',
    'embeddings',
    'concatenated',
    'hidden',
    'logits',
  ]);
  await expect(cards.locator('h5')).toHaveText([
    'Context IDs',
    'Embedding rows',
    'Concatenated features',
    'SwiGLU hidden state',
    'Vocabulary logits',
  ]);
  const shapes = await cards.evaluateAll((nodes) =>
    nodes.map(
      (node) =>
        node.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? '',
    ),
  );
  expect(shapes.map(normalizeMath)).toEqual([
    '[1,2]',
    '[1,2,4]',
    '[1,8]',
    '[1,8]',
    '[1,266]',
  ]);
  await expect(cards.nth(0)).toContainText('67');
  await expect(cards.nth(0)).toContainText('118');
  await expect(cards.nth(1)).toContainText('0.064154');
  await expect(cards.nth(2)).toContainText('-0.068284');
  await expect(cards.nth(3)).toContainText('-0.002448');
  await expect(cards.nth(4)).toContainText('0.002350');

  const checkpoints = diagram.locator('.checkpoint-card');
  await expect(checkpoints).toHaveCount(3);
  expect(await checkpoints.evaluateAll((nodes) => nodes.map((node) => node.dataset.step))).toEqual([
    '0',
    '8',
    '15',
  ]);
  await expect(checkpoints.nth(0)).toContainText('5.583505');
  await expect(checkpoints.nth(0)).toContainText('5.583482');
  await expect(checkpoints.nth(1)).toContainText('5.580106');
  await expect(checkpoints.nth(1)).toContainText('5.580365');
  await expect(checkpoints.nth(2)).toContainText('5.555850');
  await expect(checkpoints.nth(2)).toContainText('5.557362');

  const result = diagram.locator('.result-stage');
  await expect(result).toContainText('5.583482');
  await expect(result).toContainText('5.557362');
  await expect(result).toContainText('0.026120');
  const generated = diagram.locator('.token-list li');
  await expect(generated).toHaveCount(12);
  expect(
    await generated
      .locator('annotation[encoding="application/x-tex"]')
      .allTextContents(),
  ).toEqual([
    '259',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
    '211',
  ]);
  const proof = diagram.locator('.proof-grid');
  for (const token of [
    'bitwise',
    'untouched',
    'final_shifted',
    'all_nonzero',
    'replaced',
    'deterministic',
    'none',
  ]) {
    await expect(proof).toContainText(token);
  }

  const pipelineScroller = diagram.locator('.pipeline-scroll');
  await expect(pipelineScroller).toHaveAttribute('role', 'region');
  await expect(pipelineScroller).toHaveAccessibleName('Scrollable fixed-context model pipeline');
  await pipelineScroller.focus();
  await expect(pipelineScroller).toBeFocused();
  const generationScroller = diagram.locator('.generation-scroll');
  await expect(generationScroller).toHaveAttribute('role', 'region');
  await expect(generationScroller).toHaveAccessibleName(
    'Scrollable generated token ID sequence',
  );
  await generationScroller.focus();
  await expect(generationScroller).toBeFocused();

  const containment = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    natural: Array.from(
      node.querySelectorAll<HTMLElement>(
        '.pipeline-card, .checkpoint-card, .result-grid > div, .generation-summary > div, .proof-grid > div',
      ),
    ).map((part) => ({ clientHeight: part.clientHeight, scrollHeight: part.scrollHeight })),
  }));
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth);
  for (const part of containment.natural) {
    expect(part.scrollHeight).toBeLessThanOrEqual(part.clientHeight + 2);
  }
  const modelSummaryOverflow = await diagram
    .locator('.fixture-summary > div')
    .first()
    .evaluate((card) => {
      const cardRect = card.getBoundingClientRect();
      return Array.from(card.querySelectorAll<HTMLElement>('.katex'))
        .map((formula) => formula.getBoundingClientRect())
        .flatMap((formula, index) => {
          const issues: string[] = [];
          if (formula.left < cardRect.left - 1 || formula.right > cardRect.right + 1) {
            issues.push(`Frozen model formula ${index} crosses its card horizontally`);
          }
          if (formula.top < cardRect.top - 1 || formula.bottom > cardRect.bottom + 1) {
            issues.push(`Frozen model formula ${index} crosses its card vertically`);
          }
          return issues;
        });
    });
  expect(modelSummaryOverflow).toEqual([]);
  await expectLocalFormulaSeparation(page);

  if (narrow) {
    const checkpointTops = await checkpoints.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
    expect(checkpointTops[1]).toBeGreaterThan(checkpointTops[0]);
    expect(checkpointTops[2]).toBeGreaterThan(checkpointTops[1]);
    for (const scroller of [pipelineScroller, generationScroller]) {
      const width = await scroller.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(width.scroll).toBeGreaterThan(width.client);
    }
  }

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(8);
  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 23 neural n-gram vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 23 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(23);
    expect(english[22]).toEqual(
      expect.objectContaining({ chapterId, order: 23, title: chapterTitle }),
    );
    const russian = await readOrderedCourseChapters(page, 'ru');
    expect(russian).toHaveLength(7);
    expect(russian.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', chapterId));
    await expect(page.locator('.locale-switch a[data-locale="ru"]')).toHaveAttribute(
      'href',
      '/ru/course/',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveCount(0);
    const missing = await page.goto(chapterPath('ru', chapterId));
    expect(missing?.status()).toBe(404);
  });

  test('the complete Rust-backed lesson renders at desktop and narrow widths', async ({ page }) => {
    const chapters = await readOrderedCourseChapters(page, 'en');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(chapterPath('en', chapterId));
    await expectChapterContent(page, chapters, false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectChapterContent(page, chapters, true);
  });

  test('input, learned, output, checkpoint, and proof structures remain distinct in forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="neural-ngram"]');
    await expect(diagram.locator('.input-card')).toHaveCSS('border-top-style', 'solid');
    await expect(diagram.locator('.learned-card').first()).toHaveCSS(
      'border-top-style',
      'dashed',
    );
    await expect(diagram.locator('.output-card')).toHaveCSS('border-top-style', 'double');
    await expect(diagram.locator('.checkpoint-card').first()).toHaveCSS(
      'border-top-style',
      'dashed',
    );
    await expect(diagram.locator('.final-checkpoint')).toHaveCSS('border-top-style', 'double');
    await expect(diagram.locator('.improvement-result')).toHaveCSS(
      'border-top-style',
      'double',
    );
    await expect(diagram.locator('.proof-stage')).toHaveCSS('border-top-style', 'double');
    await expectNoOverflowOrClientScripts(page);
  });

  test('RTL prose keeps arrows mirrored while program identities and formulas stay left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="neural-ngram"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
    const arrowTransform = await diagram
      .locator('.pipeline-card')
      .first()
      .evaluate((node) => getComputedStyle(node, '::after').transform);
    expect(arrowTransform).not.toBe('none');
    expect(
      await diagram.locator('bdi[dir="ltr"]').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    expect(
      await diagram.locator('[data-inline-math]').evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    await expectNoOverflowOrClientScripts(page);
  });

  test('the lesson and exact trace render without JavaScript', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('.pipeline-card')).toHaveCount(5);
    await expect(page.locator('.checkpoint-card')).toHaveCount(3);
    await expect(page.locator('.token-list li')).toHaveCount(12);
    await expect(page.locator('.result-stage')).toContainText('0.026120');
    await expect(page.locator('.proof-stage')).toContainText('bitwise');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
