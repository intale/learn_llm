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

const chapterId = '15-tensor-autodiff-core';
const contentRevision = 3;
const chapterTitle = 'Reverse tensor shapes with operation-level VJPs';
const chapterDescription =
  'Build a Rust tensor autodiff tape, reverse views, broadcasts, and reductions with shape-aware VJPs, and verify gradients for LLM training.';
const revisionLabel = 'Content revision';
const formulaLatex = String.raw`\bar{x}\mathrel{+}=J_y(x)^\top\bar{y}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historyHeading = 'From explicit next-word updates to reusable tensor pullbacks';
const historyLimitation =
  "Bengio et al.'s neural language model has millions of parameters and an explicit forward phase followed by network-specific backward/update equations. Those equations make next-word gradient flow inspectable, but carrying one scalar graph node per value or a separately handwritten backward calculation for every whole tensor expression becomes unwieldy across deep, repeated blocks with shape changes.";
const historyLater =
  "Abadi et al. represent computation as operation vertices joined by tensor-valued edges and describe automatic differentiation that finds every backward path from a loss to parameters and sums the paths' partial gradients. Vaswani et al. then train repeated Transformer attention and feed-forward tensor blocks, while Radford et al. scale autoregressive Transformer language models to deeper and wider stacks.";
const historyModern =
  "This chapter records one local vector-Jacobian product per tensor operation, restores each contribution to its parent's exact shape through reshape, transpose, broadcast, sum, and mean pullbacks, and checks the rules numerically before model-specific derivatives are added. Ordinary inference does not run this tape, and its owned values, saved context, retention, release, finite-value, API, trace, and error policies are course-local.";
const historyClaims = [
  'Bengio et al. describe a neural next-word model with millions of parameters and publish an explicit forward phase followed by backward/update equations for output, hidden, and learned word-feature gradients.',
  "Abadi et al. define graph vertices as operations and edge values as tensors, then describe a differentiation library that derives backpropagation for layer-and-loss compositions by finding backward paths to parameters and summing each path's partial-gradient contribution.",
  'Vaswani et al. build the Transformer from repeated attention and position-wise feed-forward sublayers and train base models for 100,000 steps and big models for 300,000 steps with Adam.',
  'Radford et al. use Transformer-based autoregressive language models and report four sizes spanning 12 to 48 layers and 117 million to 1.542 billion parameters.',
] as const;
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://cdn.openai.com/better-language-models/language-models.pdf',
] as const;

const diagramCopy = {
  title: 'Reverse every tensor edge to its original shape',
  description:
    'Inspect eight forward nodes, eight ordered operand edges, a non-scalar seed, shape-exact VJPs, parameter-only accumulation, graph release, detach, numerical checks, and rejected unsafe requests.',
  sections: [
    'Build one shape-changing tensor graph',
    'Pull the non-scalar seed through every edge',
    'Restore exact parameter shapes',
    'Retain, accumulate, zero, release',
    'Check sum, detach, and every VJP',
    'Reject unsafe requests without mutation',
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
  ['rust/demos/ch15-tensor-autodiff-core/src/lib.rs', 'shared-tensor-vjp-fixture'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-tape-values'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-forward-operations'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-structural-vjps'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-reverse-pass'],
  ['rust/demos/ch15-tensor-autodiff-core/src/lib.rs', 'tensor-autodiff-lifecycle-gradcheck'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-autodiff-errors'],
  ['rust/demos/ch15-tensor-autodiff-core/src/main.rs', 'learner-tensor-autodiff-output'],
  ['rust/demos/ch15-tensor-autodiff-core/src/diagram_trace.rs', 'tensor-autodiff-core-trace'],
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
    order: 15,
    revision: contentRevision,
    revisionLabel,
    title: chapterTitle,
    equivalentLocales: ['en'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(chapterDescription);
  await expectSeoDescription(page, chapterDescription);

  await expect(page.locator('.lesson-body h2')).toHaveText([
    'Predict one shape-changing tensor graph',
    'Apply one local pullback instead of building a Jacobian',
    'Name the tensors, map, and adjoints',
    historyHeading,
    'Own tensor primals and save only local context',
    'Follow shape restoration edge by edge',
    'Predict before running Rust',
    'Prepare model-critical tensor gradients',
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
  expect(historyText).toContain("their symbolic graph is not evidence for this course's eager owned tape");
  expect(historyText).not.toMatch(
    /programming-language history|Rust history|Python history|framework history/i,
  );
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

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'tensor-autodiff-core',
  });
  const diagram = page.locator('figure[data-visualization-id="tensor-autodiff-core"]');
  await expect(diagram).toHaveAccessibleName(diagramCopy.title);
  await expect(diagram).toHaveAccessibleDescription(diagramCopy.description);
  for (const heading of diagramCopy.sections) {
    await expect(diagram.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }

  expect(
    await diagram.locator('[data-node-id]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-node-id'),
        label: node.getAttribute('data-node-label'),
        topology: node.getAttribute('data-topology-order'),
        operation: node.getAttribute('data-operation'),
        shape: node.getAttribute('data-shape'),
        values: node.getAttribute('data-values'),
        adjoint: node.getAttribute('data-adjoint'),
      })),
    ),
  ).toEqual([
    { id: '0', label: 'x', topology: '0', operation: 'parameter', shape: '2x3', values: '1.000000000000,2.000000000000,3.000000000000,4.000000000000,5.000000000000,6.000000000000', adjoint: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { id: '1', label: 'r', topology: '1', operation: 'reshape', shape: '3x2', values: '1.000000000000,2.000000000000,3.000000000000,4.000000000000,5.000000000000,6.000000000000', adjoint: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { id: '2', label: 't', topology: '2', operation: 'transpose', shape: '2x3', values: '1.000000000000,3.000000000000,5.000000000000,2.000000000000,4.000000000000,6.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '3', label: 'bias', topology: '3', operation: 'parameter', shape: '3', values: '1.000000000000,-1.000000000000,0.000000000000', adjoint: '16.000000000000,16.000000000000,34.000000000000' },
    { id: '4', label: 'bb', topology: '4', operation: 'broadcast', shape: '2x3', values: '1.000000000000,-1.000000000000,0.000000000000,1.000000000000,-1.000000000000,0.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '5', label: 'z', topology: '5', operation: 'add', shape: '2x3', values: '2.000000000000,2.000000000000,5.000000000000,3.000000000000,3.000000000000,6.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '6', label: 'q', topology: '6', operation: 'mul', shape: '2x3', values: '4.000000000000,4.000000000000,25.000000000000,9.000000000000,9.000000000000,36.000000000000', adjoint: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000' },
    { id: '7', label: 'y', topology: '7', operation: 'mean', shape: '2', values: '11.000000000000,18.000000000000', adjoint: '3.000000000000,6.000000000000' },
  ]);
  expect(
    await diagram.locator('tr[data-edge-reverse]').evaluateAll((rows) =>
      rows.map((row) => ({
        reverse: row.getAttribute('data-edge-reverse'),
        child: row.getAttribute('data-child'),
        operand: row.getAttribute('data-operand'),
        parent: row.getAttribute('data-parent'),
        rule: row.getAttribute('data-rule'),
        source: row.getAttribute('data-source-shape'),
        target: row.getAttribute('data-target-shape'),
        axes: row.getAttribute('data-reduced-axes'),
        context: row.getAttribute('data-saved-context'),
        upstream: row.getAttribute('data-upstream-adjoint'),
        contribution: row.getAttribute('data-contribution'),
      })),
    ),
  ).toEqual([
    { reverse: '0', child: 'y', operand: '0', parent: 'q', rule: 'mean', source: '2', target: '2x3', axes: '1', context: 'axis=1; keep-dim=no; divisor=3', upstream: '3.000000000000,6.000000000000', contribution: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000' },
    { reverse: '1', child: 'q', operand: '0', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3', axes: 'none', context: 'none', upstream: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000', contribution: '2.000000000000,2.000000000000,5.000000000000,6.000000000000,6.000000000000,12.000000000000' },
    { reverse: '2', child: 'q', operand: '1', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3', axes: 'none', context: 'none', upstream: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000', contribution: '2.000000000000,2.000000000000,5.000000000000,6.000000000000,6.000000000000,12.000000000000' },
    { reverse: '3', child: 'z', operand: '0', parent: 't', rule: 'add', source: '2x3', target: '2x3', axes: 'none', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { reverse: '4', child: 'z', operand: '1', parent: 'bb', rule: 'add', source: '2x3', target: '2x3', axes: 'none', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { reverse: '5', child: 'bb', operand: '0', parent: 'bias', rule: 'broadcast', source: '2x3', target: '3', axes: '0', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '16.000000000000,16.000000000000,34.000000000000' },
    { reverse: '6', child: 't', operand: '0', parent: 'r', rule: 'transpose', source: '2x3', target: '3x2', axes: 'none', context: 'axes=0,1', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { reverse: '7', child: 'r', operand: '0', parent: 'x', rule: 'reshape', source: '3x2', target: '2x3', axes: 'none', context: 'input=2x3; output=3x2', upstream: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000', contribution: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
  ]);

  expect(
    await diagram.locator('[data-parameter-gradient]').evaluateAll((cards) =>
      cards
        .filter((card) => card.hasAttribute('data-backward-pass'))
        .map((card) => ({
          parameter: card.getAttribute('data-parameter-gradient'),
          pass: card.getAttribute('data-backward-pass'),
          shape: card.getAttribute('data-gradient-shape'),
          gradient: card.getAttribute('data-gradient-values'),
        })),
    ),
  ).toEqual([
    { parameter: 'x', pass: '1', shape: '2x3', gradient: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { parameter: 'bias', pass: '1', shape: '3', gradient: '16.000000000000,16.000000000000,34.000000000000' },
  ]);
  expect(
    await diagram.locator('[data-lifecycle-state]').evaluateAll((cards) =>
      cards.map((card) => ({
        state: card.getAttribute('data-lifecycle-state'),
        x: card.getAttribute('data-x-gradient'),
        bias: card.getAttribute('data-bias-gradient'),
        operation: card.getAttribute('data-operation'),
        released: card.getAttribute('data-released'),
        unchanged: card.getAttribute('data-gradients-unchanged'),
      })),
    ),
  ).toEqual([
    { state: 'second-pass', x: '8.000000000000,24.000000000000,8.000000000000,24.000000000000,20.000000000000,48.000000000000', bias: '32.000000000000,32.000000000000,68.000000000000', operation: null, released: null, unchanged: null },
    { state: 'zeroed', x: '0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000', bias: '0.000000000000,0.000000000000,0.000000000000', operation: null, released: null, unchanged: null },
    { state: 'after-zero-release', x: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000', bias: '16.000000000000,16.000000000000,34.000000000000', operation: null, released: null, unchanged: null },
    { state: 'released', x: null, bias: null, operation: 'mean', released: 'yes', unchanged: 'yes' },
  ]);
  expect(
    await diagram.locator('[data-evidence]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-evidence'),
        expression: card.getAttribute('data-expression'),
        value: card.getAttribute('data-value'),
        gradient: card.getAttribute('data-parameter-gradient'),
        detached: card.getAttribute('data-detached-gradient'),
        operations: card.getAttribute('data-operations'),
        xSamples: card.getAttribute('data-x-samples'),
        biasSamples: card.getAttribute('data-bias-samples'),
        status: card.getAttribute('data-status'),
      })),
    ),
  ).toEqual([
    { kind: 'detach', expression: 'sum(p*p+detach(p)*ten)', value: '63.000000000000', gradient: '4.000000000000,6.000000000000', detached: 'none', operations: null, xSamples: null, biasSamples: null, status: null },
    { kind: 'gradcheck', expression: null, value: null, gradient: null, detached: null, operations: 'add,multiply,reshape,transpose,broadcast,sum,mean', xSamples: '0,1,3,5', biasSamples: '0,1,2', status: 'pass' },
  ]);
  expect(
    await diagram.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-error-kind'),
        gradients: card.getAttribute('data-gradients-unchanged'),
        graph: card.getAttribute('data-graph-unchanged'),
      })),
    ),
  ).toEqual([
    { kind: 'seed-shape', gradients: 'yes', graph: 'yes' },
    { kind: 'non-finite-seed', gradients: 'yes', graph: 'yes' },
    { kind: 'graph-released', gradients: 'yes', graph: 'yes' },
    { kind: 'non-finite-accumulated-gradient', gradients: 'yes', graph: 'yes' },
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
    for (const selector of [
      '.node-card',
      '.gradient-card',
      '.lifecycle-card',
      '.check-card',
      '.error-card',
    ]) {
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

test.describe('chapter 15 tensor-autodiff-core vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('English publishes Chapter 15 while Russian remains complete through Chapter 7', async ({
    page,
  }) => {
    const englishChapters = await readOrderedCourseChapters(page, 'en');
    expect(englishChapters.length).toBeGreaterThanOrEqual(15);
    expect(englishChapters[14]).toEqual(
      expect.objectContaining({ chapterId, order: 15, title: chapterTitle }),
    );

    const russianChapters = await readOrderedCourseChapters(page, 'ru');
    expect(russianChapters).toHaveLength(7);
    expect(russianChapters.some((chapter) => chapter.chapterId === chapterId)).toBe(false);

    await page.goto(chapterPath('en', '14-scalar-autodiff'));
    await expectOrderedChapterNavigation(page, 'en', '14-scalar-autodiff', englishChapters);

    await page.goto(chapterPath('en', chapterId));
    await expectLocalizedChapterRoute(page, {
      chapterId,
      locale: 'en',
      order: 15,
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
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveCount(0);

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

  test('operation roles, lifecycle states, and rejections survive forced colors', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="tensor-autodiff-core"]');
    const parameter = diagram.locator('.node-parameter').first();
    const structural = diagram.locator('.node-structural').first();
    const broadcast = diagram.locator('.node-broadcast');
    const elementwise = diagram.locator('.node-elementwise').first();
    const reduction = diagram.locator('.node-reduction');
    const second = diagram.locator('.state-secondPass');
    const zeroed = diagram.locator('.state-zeroed');
    const released = diagram.locator('.state-released');
    const rejected = diagram.locator('.state-rejected').first();
    await expect(parameter.locator('.state-symbol')).toHaveText('P');
    await expect(structural.locator('.state-symbol')).toHaveText('S');
    await expect(broadcast.locator('.state-symbol')).toHaveText('B');
    await expect(elementwise.locator('.state-symbol')).toHaveText('E');
    await expect(reduction.locator('.state-symbol')).toHaveText('Σ');
    await expect(second.locator('.state-symbol')).toHaveText('2');
    await expect(zeroed.locator('.state-symbol')).toHaveText('0');
    await expect(released.locator('.state-symbol')).toHaveText('X');
    await expect(rejected.locator('.state-symbol')).toHaveText('!');
    expect(await parameter.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('solid');
    expect(await structural.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
    expect(await broadcast.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    expect(await elementwise.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await reduction.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('ridge');
    expect(await second.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
    expect(await zeroed.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dotted');
    expect(await released.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
    await expectNoOverflowOrClientScripts(page);
  });

  test('the full lesson and Rust-derived tensor graph render with JavaScript disabled', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    await page.goto(chapterPath('en', chapterId));
    await expect(page.getByRole('heading', { level: 1, name: chapterTitle })).toBeVisible();
    await expect(page.locator('[data-node-id]')).toHaveCount(8);
    await expect(page.locator('tr[data-edge-reverse]')).toHaveCount(8);
    await expect(page.locator('[data-parameter-gradient][data-backward-pass]')).toHaveCount(2);
    await expect(page.locator('[data-lifecycle-state]')).toHaveCount(4);
    await expect(page.locator('[data-evidence]')).toHaveCount(2);
    await expect(page.locator('[data-error-kind]')).toHaveCount(4);
    await expectNoOverflowOrClientScripts(page);
    await context.close();
  });
});
