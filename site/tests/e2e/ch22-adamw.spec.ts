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

const chapterId = '22-adamw';
const chapterTitle = 'Keep decay out of the gradient moments';
const chapterDescription =
  'Build AdamW from named parameter gradients, bias-corrected moments, and a separate weight-decay path, then commit every checked update together.';
const chapterHeadings = [
  'Predict two subtractions',
  'Correct moments, then bypass them with decay',
  'Keep step state and parameter state distinct',
  'From one word gradient to AdamW-trained decoders',
  'Prepare every named replacement before commit',
  'Watch decay bypass the moment lane',
  'Predict before running the optimizer',
  'Train the first cumulative neural language model next',
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

async function expectDecayBypassFormulaContainment(page: Page) {
  const problems = await page
    .locator('figure[data-visualization-id="adamw"] .bypass-origin')
    .evaluateAll((boxes) =>
      boxes.flatMap((box, boxIndex) => {
        const element = box as HTMLElement;
        const boxRect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const edges = {
          bottom: boxRect.bottom - Number.parseFloat(style.borderBottomWidth),
          left: boxRect.left + Number.parseFloat(style.borderLeftWidth),
          right: boxRect.right - Number.parseFloat(style.borderRightWidth),
          top: boxRect.top + Number.parseFloat(style.borderTopWidth),
        };
        const issues: string[] = [];
        if (element.scrollWidth > element.clientWidth + 2) {
          issues.push(
            `box ${boxIndex} has ${element.scrollWidth - element.clientWidth}px inline debt`,
          );
        }
        for (const [formulaIndex, formula] of Array.from(
          element.querySelectorAll<HTMLElement>('.katex'),
        ).entries()) {
          const rect = formula.getBoundingClientRect();
          if (
            rect.left < edges.left - 2 ||
            rect.right > edges.right + 2 ||
            rect.top < edges.top - 2 ||
            rect.bottom > edges.bottom + 2
          ) {
            issues.push(`box ${boxIndex} formula ${formulaIndex} crosses its inner border`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 22,
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
    String.raw`m_t=\beta_1m_{t-1}+(1-\beta_1)g_t`,
    String.raw`\hat m_t=\frac{m_t}{1-\beta_1^t}`,
    String.raw`\hat m_t=\frac{m_t}{1-\beta_1^t},\quad \hat v_t=\frac{v_t}{1-\beta_2^t},\quad \theta_t=(1-\eta\lambda)\theta_{t-1}-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\varepsilon}`,
    String.raw`\eta\lambda\theta_0=[0.01,-0.02]`,
    String.raw`1-\beta_1^t=0.500000`,
    String.raw`\eta\lambda\theta=0.030000`,
    String.raw`q(x,y)=\frac12(x^2+4y^2)`,
    String.raw`\operatorname{diag}(H)=\left[1.000000,4.000000\right]`,
  ]) {
    expect(
      annotations.map(normalizeMath).some((formula) => formula.includes(normalizeMath(expected))),
      `expected a rendered formula containing ${expected}`,
    ).toBe(true);
  }
  await expect(page.locator('.lesson-body .katex-error')).toHaveCount(0);
  const code = await page.locator('.lesson-body :not(pre) > code').allTextContents();
  for (const expression of ['theta_0', 'g_1', 'm_t', 'v_t', 'eta*lambda']) {
    expect(code).not.toContain(expression);
  }
  await expectFormulaGeometry(page);

  const history = page
    .getByRole('heading', {
      level: 2,
      name: 'From one word gradient to AdamW-trained decoders',
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="From one word gradient to AdamW-trained decoders"]]',
    );
  const historyText = (await history.allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  expect(historyText).toContain('neural language model performs a direct stochastic parameter update');
  expect(historyText).toContain('Momentum first carries a decaying velocity');
  expect(historyText).toContain('Adam then keeps exponential first and second raw gradient moments');
  expect(historyText).toContain('parameter-proportional term enters both moving estimates');
  expect(historyText).toContain('AdamW instead moves the shrinkage term outside the gradient');
  expect(historyText).toContain('LLaMA documents AdamW in pretraining decoder language models');
  expect(historyText).toContain('65');
  expect(historyText).not.toMatch(/TypeScript|Python history|Rust history/i);
  await expect(history.locator('a')).toHaveCount(4);

  await expect(page.locator('figure.rust-source')).toHaveCount(9);
  await expectVisualizationDecision(page, { decision: 'useful', id: 'adamw' });
  const diagram = page.locator('figure[data-visualization-id="adamw"]');
  await expect(diagram).toHaveAccessibleName(
    'Compare update paths and keep decay group-specific',
  );
  await expect(diagram).toHaveAccessibleDescription(
    'Compare exact Rust-authored SGD and AdamW paths on unequal curvature, then follow named parameter vectors through moments, group-specific decay, and one atomic replacement.',
  );
  await expectDecayBypassFormulaContainment(page);
  const cards = diagram.locator('.parameter-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.locator('h5')).toHaveText([
    'decoder.output.weight',
    'decoder.norm.scale',
  ]);
  await expect(cards.nth(0)).toContainText('0.066667');
  await expect(cards.nth(0)).toContainText('0.010000');
  await expect(cards.nth(0)).toContainText('0.923333');
  await expect(cards.locator('[data-parameter-group]')).toHaveText([
    'Apply decay',
    'Skip decay',
  ]);
  await expect(cards.nth(0)).toContainText('decay');
  await expect(cards.nth(1)).toContainText('no_decay');
  await expect(cards.nth(1).locator('.decay-delta')).toContainText('0.000000');
  await expect(cards.nth(1).locator('.output-node')).toContainText('0.500000');
  await expect(cards.nth(1).locator('.decay-delta')).toHaveAttribute(
    'data-decay-action',
    'skip',
  );
  const bypasses = cards.locator('.decay-bypass');
  await expect(bypasses).toHaveCount(2);
  await expect(bypasses.first()).toHaveAttribute('data-decay-bypass', 'direct-from-parameter');
  await expect(bypasses.nth(1)).toHaveAttribute('data-decay-bypass', 'direct-from-parameter');
  const branchTopology = await cards.first().evaluate((card) => {
    const rect = (selector: string) =>
      (card.querySelector<HTMLElement>(selector) as HTMLElement).getBoundingClientRect();
    const input = rect('.input-node');
    const moments = rect('.moment-node');
    const adaptive = rect('.adaptive-delta');
    const bypass = rect('.decay-bypass');
    const origin = rect('.bypass-origin');
    const decay = rect('.decay-delta');
    return {
      rowSeparated: bypass.top >= Math.max(input.bottom, moments.bottom, adaptive.bottom) - 1,
      originAligned: Math.abs(origin.left - input.left) <= 1,
      decayAligned: Math.abs(decay.right - adaptive.right) <= 1,
    };
  });
  expect(branchTopology).toEqual({
    rowSeparated: true,
    originAligned: true,
    decayAligned: true,
  });

  const trajectory = diagram.locator('.trajectory-stage');
  const trajectoryLanes = trajectory.locator('.trajectory-lane');
  await expect(trajectoryLanes).toHaveCount(2);
  await expect(trajectoryLanes.locator('h5')).toHaveText([
    'SGD trajectory',
    'AdamW trajectory',
  ]);
  await expect(trajectoryLanes.nth(0).locator('li')).toHaveCount(5);
  await expect(trajectoryLanes.nth(1).locator('li')).toHaveCount(5);
  await expect(trajectoryLanes.nth(0).locator('li').last()).toContainText(
    '[0.656100,0.129600]',
  );
  await expect(trajectoryLanes.nth(1).locator('li').last()).toContainText(
    '[0.607580,0.578823]',
  );
  await expect(trajectory.locator('annotation[encoding="application/x-tex"]')).toHaveCount(23);
  await expect(diagram.locator('.proof-stage')).toContainText('decoder.norm.scale');
  await expect(diagram.locator('.proof-stage')).toContainText('Exact zero');
  await expect(diagram.locator('.proof-stage')).toContainText('Unchanged');
  await expect(diagram.locator('.proof-stage')).toContainText('Atomic');

  const scrollers = diagram.locator('.parameter-scroll');
  await expect(scrollers).toHaveCount(2);
  await expect(scrollers.first()).toHaveAttribute('role', 'region');
  await expect(scrollers.first()).toHaveAccessibleName(
    'Scrollable AdamW vector evidence for parameter decoder.output.weight',
  );
  await scrollers.first().focus();
  await expect(scrollers.first()).toBeFocused();
  const trajectoryScroller = diagram.locator('.trajectory-scroll');
  await expect(trajectoryScroller).toHaveAttribute('role', 'region');
  await expect(trajectoryScroller).toHaveAccessibleName(
    'Scrollable SGD and AdamW trajectory evidence',
  );
  await trajectoryScroller.focus();
  await expect(trajectoryScroller).toBeFocused();

  const containment = await diagram.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    cards: Array.from(node.querySelectorAll<HTMLElement>('.parameter-card')).map((card) => ({
      clientHeight: card.clientHeight,
      scrollHeight: card.scrollHeight,
    })),
    trajectory: Array.from(
      node.querySelectorAll<HTMLElement>('.trajectory-stage, .trajectory-lane'),
    ).map((part) => ({ clientHeight: part.clientHeight, scrollHeight: part.scrollHeight })),
  }));
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth);
  for (const card of containment.cards) {
    expect(card.scrollHeight).toBeLessThanOrEqual(card.clientHeight + 2);
  }
  for (const part of containment.trajectory) {
    expect(part.scrollHeight).toBeLessThanOrEqual(part.clientHeight + 2);
  }
  const overlaps = await diagram
    .locator('.moment-node, .trajectory-lane')
    .evaluateAll((containers) =>
      containers.flatMap((container, containerIndex) => {
        const formulas = Array.from(container.querySelectorAll<HTMLElement>('.katex'));
        const issues: string[] = [];
        for (let leftIndex = 0; leftIndex < formulas.length; leftIndex += 1) {
          const left = formulas[leftIndex].getBoundingClientRect();
          for (let rightIndex = leftIndex + 1; rightIndex < formulas.length; rightIndex += 1) {
            const right = formulas[rightIndex].getBoundingClientRect();
            const overlapsHorizontally = left.left < right.right - 1 && right.left < left.right - 1;
            const overlapsVertically = left.top < right.bottom - 1 && right.top < left.bottom - 1;
            if (overlapsHorizontally && overlapsVertically) {
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
  if (narrow) {
    const cardTops = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
    expect(cardTops[1]).toBeGreaterThan(cardTops[0]);
    const width = await scrollers.first().evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(width.scroll).toBeGreaterThan(width.client);
    const trajectoryWidth = await trajectoryScroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(trajectoryWidth.scroll).toBeGreaterThan(trajectoryWidth.client);
  }

  const details = page.locator('.lesson-body details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(details.locator('ol > li')).toHaveCount(9);
  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 22 AdamW vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 22 while its Russian route remains deferred', async ({
    page,
  }) => {
    const english = await readOrderedCourseChapters(page, 'en');
    expect(english.length).toBeGreaterThanOrEqual(22);
    expect(english[21]).toEqual(
      expect.objectContaining({ chapterId, order: 22, title: chapterTitle }),
    );
    const russian = await readOrderedCourseChapters(page, 'ru');
    expect(russian.length).toBeGreaterThan(0);
    const lastRussianChapter = russian[russian.length - 1]!;
    await page.goto(chapterPath('ru', lastRussianChapter.chapterId));
    await expectOrderedChapterNavigation(
      page,
      'ru',
      lastRussianChapter.chapterId,
      russian,
    );
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
    const diagram = page.locator('figure[data-visualization-id="adamw"]');
    const toggle = diagram.locator('[data-diagram-full-view-toggle]');
    await expect(toggle).toHaveCount(1);
    await toggle.click();
    await page.waitForFunction(
      () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'adamw',
    );
    await expectDecayBypassFormulaContainment(page);
    await toggle.click();
    await page.waitForFunction(() => document.fullscreenElement === null);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectChapterContent(page, chapters, true);
  });

  test('adaptive, decay, and commit structures remain distinct in forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="adamw"]');
    await expect(diagram.locator('.adaptive-delta').first()).toHaveCSS(
      'border-top-style',
      'solid',
    );
    await expect(diagram.locator('.decay-delta').first()).toHaveCSS(
      'border-top-style',
      'dashed',
    );
    await expect(diagram.locator('.proof-stage')).toHaveCSS('border-top-style', 'double');
    await expect(diagram.locator('.trajectory-lane.sgd')).toHaveCSS(
      'border-top-style',
      'solid',
    );
    await expect(diagram.locator('.trajectory-lane.adamw')).toHaveCSS(
      'border-top-style',
      'double',
    );
    await expectNoOverflowOrClientScripts(page);
  });

  test('localized labels inherit RTL while program identities and formulas remain left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="adamw"]');
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await expect(diagram.locator('.diagram-description')).toHaveCSS('direction', 'rtl');
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
    await expect(page.locator('.parameter-card')).toHaveCount(2);
    await expect(page.locator('.trajectory-lane')).toHaveCount(2);
    await expect(page.locator('.trajectory-lane li')).toHaveCount(10);
    await expect(page.locator('.decay-delta').first()).toContainText('0.010000');
    await expect(page.locator('.proof-stage')).toContainText('Atomic');
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
