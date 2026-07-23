// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

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

declare const process: { cwd(): string };

const chapterId = '14-scalar-autodiff';
const contentRevision = 3;
const chapterTitle = 'Accumulate gradients through a scalar graph';
const chapterDescription =
  'Build reverse-mode scalar autodiff in Rust, accumulate gradients across reused graph edges, and verify them for LLM training.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`\bar v=\sum_{c\in\operatorname{children}(v)}\bar c\,\frac{\partial c}{\partial v}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From next-word updates to scaled autoregressive Transformers';
const historyLimitation =
  "Bengio et al.'s neural language model learns next-word probabilities and distributed word features with an explicit forward phase followed by backward/update equations. Baydin et al. show that careless symbolic differentiation can duplicate reused expressions and that forward mode needs one seeded pass per input to obtain a scalar loss's full gradient, so neither scales cleanly to a language model with many parameters.";
const historyLater =
  'Baydin et al. describe reverse mode as recording dependencies during a forward evaluation and propagating adjoints from one scalar output back through the graph, adding contributions from every path. That direction fits a scalar training objective with many parameters. Vaswani et al. then train repeated Transformer attention and feed-forward layers, and Radford et al. scale autoregressive Transformer language models from 12 to 48 layers and from 117 million to 1.542 billion parameters.';
const historyModern =
  "This chapter isolates reverse accumulation in a tiny scalar graph, checks its derivatives with Chapter 13's independent numerical oracle, and prepares the tensor-operation tape used for LLM training in Chapters 15 and 16. Ordinary decoder inference does not run this backward graph, and its representation, traversal, accumulation, zeroing, detach, finite-value, API, trace, and error policies are course-local.";
const historyClaims = [
  'Bengio et al. learn next-word probabilities and word-feature parameters and publish a forward phase plus a backward/update phase that clears and adds gradients through output units, hidden units, and input word features.',
  "Baydin et al. show how symbolic differentiation can duplicate shared expressions, explain that forward mode needs one pass per input for a scalar output's full gradient, and describe reverse dependency recording and adjoint accumulation in one reverse pass.",
  'Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam.',
  'Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters.',
] as const;
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://www.jmlr.org/papers/volume18/17-468/17-468.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://cdn.openai.com/better-language-models/language-models.pdf',
] as const;

const diagramCopy = {
  title: 'Follow every repeated edge back to one scalar',
  description:
    'Inspect three unique forward nodes, four repeated operand edges, their ordered reverse contributions, two accumulated passes, zeroing, detach, numerical agreement, and rejected unsafe requests.',
  sections: [
    'Build one shared forward graph',
    'Accumulate one fresh reverse pass',
    'Commit, repeat, zero, and restore',
    'Check detach and the numerical oracle',
    'Reject unsafe gradients before mutation',
  ],
};

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustRegions = [
  ['rust/demos/ch14-scalar-autodiff/src/lib.rs', 'shared-scalar-fixture'],
  ['rust/crates/llm-from-scratch/src/autograd/scalar.rs', 'scalar-dag-operations'],
  ['rust/crates/llm-from-scratch/src/autograd/scalar.rs', 'scalar-reverse-pass'],
  ['rust/crates/llm-from-scratch/src/autograd/scalar.rs', 'scalar-autodiff-errors'],
  ['rust/demos/ch14-scalar-autodiff/src/lib.rs', 'nonlinear-detach-gradcheck'],
  ['rust/demos/ch14-scalar-autodiff/src/main.rs', 'learner-scalar-autodiff-output'],
  ['rust/demos/ch14-scalar-autodiff/src/diagram_trace.rs', 'scalar-autodiff-trace'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: 'en',
    order: 14,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict a reused scalar’s gradient',
    'Accumulate every reverse path',
    'Name the graph and adjoints',
    historyHeading,
    'Build one fresh reverse pass',
    'Follow every operand edge backward',
    'Predict before running Rust',
    'Prepare tensor reverse mode',
  ]);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${historyHeading}"]]`,
    );
  const historyText = (await historyNodes.allInnerTexts())
    .join(' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  for (const expected of [historyLimitation, historyLater, historyModern, ...historyClaims]) {
    expect(historyText).toContain(expected);
  }
  expect(historyText).toContain('Neither Transformer paper specifies this Scalar type');
  expect(historyText).not.toMatch(/programming-language history|Rust history|Python history|framework history/i);
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  const formulae = page.locator('.katex-display');
  expect(await formulae.count()).toBeGreaterThan(0);
  expect(
    await formulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).not.toContain('rtl');
  expect(
    await formulae.locator('annotation[encoding="application/x-tex"]').allTextContents(),
  ).toContain(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));
  for (const evidence of await highlighted.evaluateAll((blocks) =>
    blocks.map((block) => ({
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
    expect(evidence.colors).toBeGreaterThan(1);
  }

  await expectVisualizationDecision(page, { decision: 'useful', id: 'scalar-autodiff' });
  const diagram = page.locator('figure[data-visualization-id="scalar-autodiff"]');
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }

  expect(
    await diagram.locator('[data-node-id]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-node-id'),
        label: node.getAttribute('data-node-label'),
        topology: node.getAttribute('data-topology-order'),
        operation: node.getAttribute('data-operation'),
        value: node.getAttribute('data-value'),
        adjoint: node.getAttribute('data-pass-adjoint'),
      })),
    ),
  ).toEqual([
    { id: '0', label: 'x', topology: '0', operation: 'variable', value: '2.000000000000', adjoint: '8.000000000000' },
    { id: '1', label: 'square', topology: '1', operation: 'mul', value: '4.000000000000', adjoint: '2.000000000000' },
    { id: '2', label: 'loss', topology: '2', operation: 'add', value: '8.000000000000', adjoint: '1.000000000000' },
  ]);
  expect(
    await diagram.locator('tr[data-edge-reverse]').evaluateAll((rows) =>
      rows.map((row) => ({
        reverse: row.getAttribute('data-edge-reverse'),
        child: row.getAttribute('data-child'),
        operand: row.getAttribute('data-operand'),
        parent: row.getAttribute('data-parent'),
        local: row.getAttribute('data-local-derivative'),
        upstream: row.getAttribute('data-upstream-adjoint'),
        contribution: row.getAttribute('data-contribution'),
      })),
    ),
  ).toEqual([
    { reverse: '0', child: 'loss', operand: '0', parent: 'square', local: '1.000000000000', upstream: '1.000000000000', contribution: '1.000000000000' },
    { reverse: '1', child: 'loss', operand: '1', parent: 'square', local: '1.000000000000', upstream: '1.000000000000', contribution: '1.000000000000' },
    { reverse: '2', child: 'square', operand: '0', parent: 'x', local: '2.000000000000', upstream: '2.000000000000', contribution: '4.000000000000' },
    { reverse: '3', child: 'square', operand: '1', parent: 'x', local: '2.000000000000', upstream: '2.000000000000', contribution: '4.000000000000' },
  ]);
  expect(
    await diagram.locator('[data-backward-pass]').evaluateAll((cards) =>
      cards.map((card) => ({
        pass: card.getAttribute('data-backward-pass'),
        x: card.getAttribute('data-x-gradient'),
        square: card.getAttribute('data-square-gradient'),
        loss: card.getAttribute('data-loss-gradient'),
      })),
    ),
  ).toEqual([
    { pass: '1', x: '8.000000000000', square: '2.000000000000', loss: '1.000000000000' },
    { pass: '2', x: '16.000000000000', square: '4.000000000000', loss: '2.000000000000' },
    { pass: 'after-zero', x: '8.000000000000', square: '2.000000000000', loss: '1.000000000000' },
  ]);
  await expect(diagram.locator('[data-gradient-state="zeroed"]')).toHaveAttribute(
    'data-x-gradient',
    '0.000000000000',
  );
  expect(
    await diagram.locator('[data-evidence]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-evidence'),
        expression: card.getAttribute('data-expression'),
        value: card.getAttribute('data-value'),
        gradient: card.getAttribute('data-gradient'),
        analytic: card.getAttribute('data-analytic'),
        numerical: card.getAttribute('data-numerical'),
        status: card.getAttribute('data-status'),
      })),
    ),
  ).toEqual([
    { kind: 'detach', expression: 'x*x+detach(x)*3', value: '10.000000000000', gradient: '4.000000000000', analytic: null, numerical: null, status: null },
    { kind: 'nonlinear', expression: 'exp(tanh(x))', value: '1.587431271430', gradient: '1.248431724655', analytic: null, numerical: null, status: null },
    { kind: 'gradcheck', expression: '2*x*x', value: null, gradient: null, analytic: '8.000000000000', numerical: '8.000000000052', status: 'pass' },
  ]);
  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-error-kind'),
        unchanged: card.getAttribute('data-gradients-unchanged'),
      })),
    ),
  ).toEqual([
    { kind: 'constant-output', unchanged: 'yes' },
    { kind: 'non-finite-seed', unchanged: 'yes' },
    { kind: 'non-finite-accumulated-gradient', unchanged: 'yes' },
  ]);

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scroller = diagram.locator('.trace-scroll');
  await scroller.focus();
  await expect(scroller).toBeFocused();
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const selector of ['.node-card', '.snapshot-card', '.evidence-card', '.error-card']) {
      const positions = await diagram.locator(selector).evaluateAll((cards) =>
        cards.slice(0, 2).map((card) => {
          const rectangle = card.getBoundingClientRect();
          return { left: rectangle.left, top: rectangle.top, bottom: rectangle.bottom };
        }),
      );
      expect(positions).toHaveLength(2);
      expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
      expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    }
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, 'en', chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 14 scalar-autodiff vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 14 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(14);
    expect(englishChapters[13]).toEqual(
      expect.objectContaining({ chapterId, order: 14, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '13-gradient-checking'));
    await expectOrderedChapterNavigation(page, 'en', '13-gradient-checking', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 14,
      revision: contentRevision,
      revisionLabel,
      title: chapterTitle,
      equivalentLocales: ['en'],
      fallbackRouteSuffix: '/course/',
    });
    const russianSwitch = page.locator('.locale-switch a[data-locale="ru"]');
    await expect(russianSwitch).toHaveAttribute('href', '/ru/course/');
    await expect(russianSwitch).toHaveAttribute('data-locale-fallback', 'course-index');
    await expect(russianSwitch).toHaveAttribute('aria-label', /.+/);

    const missing = await page.goto(chapterPath('ru', chapterId));
    expect(missing?.status()).toBe(404);
  });

  test('the complete Rust-backed lesson renders at desktop and narrow widths', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const chapters = await readOrderedCourseChapters(page, 'en');
    await page.goto(chapterPath('en', chapterId));
    await expectChapterContent(page, chapters, false);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectChapterContent(page, chapters, true);
  });

  test('node roles, pass states, and rejections survive forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="scalar-autodiff"]');
    const leaf = diagram.locator('.node-leaf');
    const shared = diagram.locator('.node-shared');
    const output = diagram.locator('.node-output');
    const first = diagram.locator('.state-firstPass');
    const second = diagram.locator('.state-secondPass');
    const zeroed = diagram.locator('.state-zeroed');
    const rejected = diagram.locator('.state-rejected').first();
    await expect(leaf.locator('.state-symbol')).toHaveText('L');
    await expect(shared.locator('.state-symbol')).toHaveText('S');
    await expect(output.locator('.state-symbol')).toHaveText('O');
    await expect(first.locator('.state-symbol')).toHaveText('1');
    await expect(second.locator('.state-symbol')).toHaveText('2');
    await expect(zeroed.locator('.state-symbol')).toHaveText('0');
    await expect(rejected.locator('.state-symbol')).toHaveText('X');
    expect(await leaf.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('solid');
    expect(await shared.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await output.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    expect(await second.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await zeroed.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
    expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    await expectNoOverflowOrClientScripts(page);
  });

  test('the full lesson and Rust-derived graph render with JavaScript disabled', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('[data-node-id]')).toHaveCount(3);
    await expect(page.locator('tr[data-edge-reverse]')).toHaveCount(4);
    await expect(page.locator('[data-backward-pass]')).toHaveCount(3);
    await expect(page.locator('[data-evidence]')).toHaveCount(3);
    await expect(page.locator('[data-error-kind]')).toHaveCount(3);
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
